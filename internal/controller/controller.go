package controller

import (
	"sync"
	"time"
)

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

func (t OrderType) String() string {
	switch t {
	case OrderNormal:
		return "Normal"
	case OrderVIP:
		return "VIP"
	}
	return "Unknown"
}

type OrderStatus int

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderComplete
)

func (s OrderStatus) String() string {
	switch s {
	case OrderPending:
		return "PENDING"
	case OrderProcessing:
		return "PROCESSING"
	case OrderComplete:
		return "COMPLETE"
	}
	return "UNKNOWN"
}

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
	StartedAt *time.Time
}

type Bot struct {
	ID     int
	order  *Order
	stopCh chan struct{}
}

type Controller struct {
	mu sync.Mutex

	nextOrderID int
	nextBotID   int

	vipQueue    []*Order
	normalQueue []*Order
	completed   []*Order
	bots        []*Bot

	orderCh chan struct{}
}

func New() *Controller {
	return &Controller{
		nextOrderID: 1001,
		nextBotID:   1,
		orderCh:     make(chan struct{}, 1),
	}
}
