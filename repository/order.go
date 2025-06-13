package repository

import (
	"container/list"
	"context"
	"log"
	"sync"
	"sync/atomic"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/models"
)

var orderStoragePtr OrderStorage

type OrderStorage interface {
	GenerateID(context.Context) int64

	CreatePending(context.Context, int64, consts.OrderPriority) (*models.Order, error)

	FindByID(context.Context, int64) (*models.Order, error)
	HasVipPending(context.Context) bool
	TakePending(context.Context, consts.OrderPriority) (*models.Order, error)

	ChangeStatusToProcessing(context.Context, *models.Order, *models.Bot) error
	ChangeStatusToFinish(context.Context, *models.Order) error
	ChangeStatusFromProcessingToPending(context.Context, *models.Order) error

	// 获取未完成的订单列表
	FetchUncompleted(context.Context) ([]*models.Order, error)

	// 获取最近已完成的订单列表
	FetchRecentCompleted(context.Context, int) ([]*models.Order, error)
}

type OrderPoolMemory struct {
	NormalPendingOrders *list.List              // 等待中的普通订单
	VipPendingOrders    *list.List              // 等待中的 VIP 订单
	CompletedOrders     []*models.Order         // 已完成订单
	AllOrders           []*models.Order         // 所有订单
	AllOrderMap         map[int64]*models.Order // hash 提高查询效率
	mutex               sync.Mutex

	currentOrderID int64
}

func InitOrderRepository() {
	orderStoragePtr = &OrderPoolMemory{
		NormalPendingOrders: list.New(),
		VipPendingOrders:    list.New(),
		CompletedOrders:     make([]*models.Order, 0, 64),
		AllOrders:           make([]*models.Order, 0, 1024),
		AllOrderMap:         make(map[int64]*models.Order),
	}
}

func GetOrderRepository() OrderStorage {
	return orderStoragePtr
}

func (p *OrderPoolMemory) LockAll(ctx context.Context) {
	p.mutex.Lock()
}

func (p *OrderPoolMemory) UnlockAll(ctx context.Context) {
	p.mutex.Unlock()
}

func (p *OrderPoolMemory) GenerateID(ctx context.Context) int64 {
	return atomic.AddInt64(&p.currentOrderID, 1)
}

func (p *OrderPoolMemory) HasVipPending(ctx context.Context) bool {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)
	return p.VipPendingOrders.Len() > 0
}

func (p *OrderPoolMemory) addPending(ctx context.Context, order *models.Order, isBack bool) error {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	switch order.Priority {
	case consts.OrderPriorityNormal:
		if isBack {
			p.NormalPendingOrders.PushBack(order)
		} else {
			p.NormalPendingOrders.PushFront(order)
		}
	case consts.OrderPriorityVip:
		if isBack {
			p.VipPendingOrders.PushBack(order)
		} else {
			p.VipPendingOrders.PushFront(order)
		}
	default:
		break
	}

	if _, ok := p.AllOrderMap[order.ID]; !ok {
		p.AllOrderMap[order.ID] = order
		p.AllOrders = append(p.AllOrders, order)
	}

	return nil
}

func (p *OrderPoolMemory) TakePending(ctx context.Context, priority consts.OrderPriority) (*models.Order, error) {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	var order *models.Order
	var e *list.Element

	switch priority {
	case consts.OrderPriorityNormal:
		e = p.NormalPendingOrders.Front()
		order = e.Value.(*models.Order)
		p.NormalPendingOrders.Remove(e)
	case consts.OrderPriorityVip:
		e = p.VipPendingOrders.Front()
		order = e.Value.(*models.Order)
		p.VipPendingOrders.Remove(e)
	default:
		break
	}

	return order, nil
}

func (p *OrderPoolMemory) FindByID(ctx context.Context, id int64) (*models.Order, error) {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	return p.AllOrderMap[id], nil
}

func (p *OrderPoolMemory) FetchUncompleted(ctx context.Context) ([]*models.Order, error) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	var uncompletedOrders []*models.Order

	for _, order := range p.AllOrders {
		if order.Status != consts.OrderStatusFinished {
			uncompletedOrders = append(uncompletedOrders, order)
		}
	}

	return uncompletedOrders, nil
}
func (p *OrderPoolMemory) FetchRecentCompleted(ctx context.Context, num int) ([]*models.Order, error) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	l := len(p.CompletedOrders)
	maxNum := min(l, num)

	return p.CompletedOrders[l-maxNum:], nil
}

func (p *OrderPoolMemory) ChangeStatusFromProcessingToPending(ctx context.Context, order *models.Order) error {
	order.Lock()
	defer order.Unlock()

	if order.Status != consts.OrderStatusProcessing {
		log.Printf("Order %d status is not processing, ignore reset", order.ID)
		return nil
	}

	order.Status = consts.OrderStatusPending
	order.BotID = 0

	// 重新生成 cancel ctx
	cancelCtx, cancelFunc := context.WithCancel(ctx)
	order.CancelCtx = cancelCtx
	order.CancelFunc = cancelFunc

	p.addPending(ctx, order, false)
	return nil
}

func (p *OrderPoolMemory) ChangeStatusToFinish(ctx context.Context, order *models.Order) error {
	if order == nil {
		return errdef.ErrOrderNotFound
	}

	order.Lock()
	defer order.Unlock()

	if order.Status != consts.OrderStatusProcessing {
		return errdef.ErrOrderStatusNotMatch
	}

	order.Status = consts.OrderStatusFinished

	p.CompletedOrders = append(p.CompletedOrders, order)
	return nil

}

func (p *OrderPoolMemory) ChangeStatusToProcessing(ctx context.Context, order *models.Order, bot *models.Bot) error {
	if order == nil {
		return errdef.ErrOrderNotFound
	}

	if bot == nil {
		return errdef.ErrBotNotFound
	}

	order.Lock()
	defer order.Unlock()

	if order.Status != consts.OrderStatusPending {
		return errdef.ErrOrderStatusNotMatch
	}

	order.Status = consts.OrderStatusProcessing
	order.BotID = bot.ID

	return nil
}

func (p *OrderPoolMemory) CreatePending(ctx context.Context, customerID int64, priority consts.OrderPriority) (*models.Order, error) {
	orderID := p.GenerateID(ctx)

	cancelCtx, cancelFunc := context.WithCancel(ctx)

	order := models.Order{
		ID:         orderID,
		CustomerID: customerID,
		Priority:   priority,
		Status:     consts.OrderStatusPending,
		BotID:      0,

		CancelCtx:  cancelCtx,
		CancelFunc: cancelFunc,
	}

	if err := p.addPending(ctx, &order, true); err != nil {
		return nil, err
	}

	return &order, nil
}
