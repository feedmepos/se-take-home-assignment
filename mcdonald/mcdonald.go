package mcdonald

import (
	"sync"
)

type McDonald struct {
	PendingOrder  []*Order
	CompleteOrder []*Order
	Bots          []*Bot

	nextOrderID int
	nextBotID   int

	mu             sync.Mutex
	orderProcessed chan *Order
}

func New() *McDonald {
	return &McDonald{
		PendingOrder:   make([]*Order, 0),
		CompleteOrder:  make([]*Order, 0),
		Bots:           make([]*Bot, 0),
		nextOrderID:    1,
		nextBotID:      1,
		orderProcessed: make(chan *Order),
	}
}

func (m *McDonald) GetPendingOrders() []*Order {
	m.mu.Lock()
	defer m.mu.Unlock()

	result := make([]*Order, len(m.PendingOrder))
	copy(result, m.PendingOrder)
	return result
}

func (m *McDonald) GetBots() []*Bot {
	m.mu.Lock()
	defer m.mu.Unlock()

	result := make([]*Bot, len(m.Bots))
	copy(result, m.Bots)
	return result
}
