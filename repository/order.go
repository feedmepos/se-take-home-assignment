package repository

import (
	"container/list"
	"context"
	"sync"
	"sync/atomic"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/models"
)

var orderStoragePtr OrderStorage

type OrderStorage interface {
	GenerateID(context.Context) int64

	FindByID(context.Context, int64) (*models.Order, error)
	Add(context.Context, *models.Order) error
	AddHead(context.Context, *models.Order) error
	HasVipOrder(context.Context) bool
	Take(context.Context, consts.OrderPriority) (*models.Order, error)

	LockAll(context.Context)
	UnlockAll(context.Context)
}

type OrderPoolMemory struct {
	NormalPendingOrders *list.List
	VipPendingOrders    *list.List
	pendingOrderMap     map[int64]*models.Order
	mutex               sync.Mutex

	currentOrderID int64
}

func InitOrderRepository() {
	orderStoragePtr = &OrderPoolMemory{
		NormalPendingOrders: list.New(),
		VipPendingOrders:    list.New(),
		pendingOrderMap:     make(map[int64]*models.Order, 16),
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

func (p *OrderPoolMemory) HasVipOrder(ctx context.Context) bool {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)
	return p.VipPendingOrders.Len() > 0
}

func (p *OrderPoolMemory) Add(ctx context.Context, order *models.Order) error {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	switch order.Priority {
	case consts.OrderPriorityNormal:
		p.NormalPendingOrders.PushBack(order)
	case consts.OrderPriorityVip:
		p.VipPendingOrders.PushBack(order)
	default:
		break
	}

	p.pendingOrderMap[order.ID] = order

	return nil
}

func (p *OrderPoolMemory) AddHead(ctx context.Context, order *models.Order) error {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	switch order.Priority {
	case consts.OrderPriorityNormal:
		p.NormalPendingOrders.PushFront(order)
	case consts.OrderPriorityVip:
		p.VipPendingOrders.PushFront(order)
	default:
		break
	}

	p.pendingOrderMap[order.ID] = order

	return nil
}

func (p *OrderPoolMemory) Take(ctx context.Context, priority consts.OrderPriority) (*models.Order, error) {
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

	if order != nil {
		delete(p.pendingOrderMap, order.ID)
	}

	return order, nil
}

func (p *OrderPoolMemory) FindByID(ctx context.Context, id int64) (*models.Order, error) {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	return p.pendingOrderMap[id], nil
}
