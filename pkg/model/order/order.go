package order

import (
	"mcd/pkg/util"
	"sync"
	"sync/atomic"
	"time"
)

type OrderType string

const (
	TypeVIP    OrderType = "VIP"
	TypeNormal OrderType = "Normal"
)

type OrderStatus string

const (
	StatusPending    OrderStatus = "PENDING"
	StatusProcessing OrderStatus = "PROCESSING"
	StatusComplete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID         int
	Type       OrderType
	Status     OrderStatus
	CreateAt   time.Time
	CompleteAt time.Time
	mu         sync.RWMutex
}

var currOrderID int64 = 1000

func NewOrder(orderType OrderType) *Order {
	id := int(atomic.AddInt64(&currOrderID, 1))

	order := &Order{
		ID:       id,
		Type:     orderType,
		Status:   StatusPending,
		CreateAt: time.Now(),
	}

	util.Log("New order created: ID=%d, Type=%s, Status=%s", order.ID, order.Type, order.Status)

	return order
}

func (o *Order) Complete() {
	o.Status = StatusComplete
	o.CompleteAt = time.Now()
}
