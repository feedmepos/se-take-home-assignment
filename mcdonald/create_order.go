package mcdonald

import (
	"time"
)

func (m *McDonald) CreateOrder(customer Customer) *Order {
	m.mu.Lock()
	defer m.mu.Unlock()

	order := &Order{
		ID:       m.nextOrderID,
		Customer: customer,
		Status:   StatusPending,
	}
	m.nextOrderID++

	logger := GetLogger()
	logger.LogOrderCreated(order.ID, customer)

	m.insertPendingOrder(order)
	m.assignOrderToIdleBot()

	return order
}

func (m *McDonald) assignOrderToIdleBot() {
	if len(m.PendingOrder) == 0 {
		return
	}

	for _, bot := range m.Bots {
		if !bot.IsProcessing {
			order := m.PendingOrder[0]
			m.PendingOrder = m.PendingOrder[1:]
			m.startCookingForBot(bot, order)
			return
		}
	}
}

func (m *McDonald) startCookingForBot(bot *Bot, order *Order) {
	bot.IsProcessing = true
	bot.CurrentOrder = order
	order.Status = StatusProcessing

	logger := GetLogger()
	logger.LogOrderPickup(bot.ID, order.ID, order.Customer)

	go m.cookOrder(bot, order)
}

func (m *McDonald) cookOrder(bot *Bot, order *Order) {
	select {
	case <-time.After(10 * time.Second):
		m.mu.Lock()
		order.Status = StatusComplete
		m.CompleteOrder = append(m.CompleteOrder, order)
		bot.IsProcessing = false
		bot.CurrentOrder = nil
		m.mu.Unlock()

		logger := GetLogger()
		logger.LogOrderComplete(bot.ID, order.ID, order.Customer, 10)

		m.mu.Lock()
		m.assignOrderToIdleBot()
		m.mu.Unlock()

	case <-bot.StopChannel:
		m.mu.Lock()
		order.Status = StatusPending

		m.insertPendingOrder(order)
		bot.IsProcessing = false
		bot.CurrentOrder = nil
		m.mu.Unlock()

		m.orderProcessed <- order
	}
}

func (m *McDonald) insertPendingOrder(order *Order) {
	if order.Customer == VIPCustomer {
		insertIdx := len(m.PendingOrder)
		for i, o := range m.PendingOrder {
			if o.Customer == NormalCustomer {
				insertIdx = i
				break
			}
		}

		leftOrders := append([]*Order{order}, m.PendingOrder[insertIdx:]...)
		m.PendingOrder = append(m.PendingOrder[:insertIdx], leftOrders...)
	} else {
		m.PendingOrder = append(m.PendingOrder, order)
	}
}
