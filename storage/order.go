package storage

import (
	"container/list"
	"context"
	"sync"
	"sync/atomic"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
)

var orderStoragePtr OrderStorage

type OrderStorage interface {
	GenerateID(context.Context) int64

	FindByID(context.Context, int64) (*models.Order, error)
	Add(context.Context, *models.Order) error
	HasVipOrder(context.Context) bool
	Take(context.Context, consts.OrderPriority) (*models.Order, error)
}

type OrderPoolMemory struct {
	NormalPendingOrders *list.List
	VipPendingOrders    *list.List
	mutex               sync.Mutex

	currentOrderID int64
}

func InitOrderStorage() {
	orderStoragePtr = &OrderPoolMemory{
		NormalPendingOrders: list.New(),
		VipPendingOrders:    list.New(),
	}
}

func GetOrderStorage() OrderStorage {
	return orderStoragePtr
}

func (p *OrderPoolMemory) GenerateID(ctx context.Context) int64 {
	return atomic.AddInt64(&p.currentOrderID, 1)
}

func (p *OrderPoolMemory) HasVipOrder(ctx context.Context) bool {
	return p.VipPendingOrders.Len() > 0
}

func (p *OrderPoolMemory) Add(ctx context.Context, order *models.Order) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	switch order.Priority {
	case consts.OrderPriorityNormal:
		p.NormalPendingOrders.PushBack(order)
	case consts.OrderPriorityVip:
		p.VipPendingOrders.PushBack(order)
	default:
		break
	}

	eventbus.PublishOrderCreated(ctx, order.ID)

	return nil
}

func (p *OrderPoolMemory) Take(ctx context.Context, priority consts.OrderPriority) (*models.Order, error) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

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
	return nil, nil
}
