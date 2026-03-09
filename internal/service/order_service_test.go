package service

import (
	"testing"

	"github.com/hwakman/se-take-home-assignment/internal/domain"
	"github.com/stretchr/testify/assert"
)

func TestOrderService_OrderFlow(t *testing.T) {
	s := NewOrderService()
	
	// Create order
	order := s.CreateOrder("John", domain.OrderTypeNormal)
	assert.Equal(t, 1, order.ID)
	assert.Equal(t, domain.OrderStatusPending, order.Status)

	// Get order
	o, ok := s.GetOrder(1)
	assert.True(t, ok)
	assert.Equal(t, order, o)

	// List orders
	orders := s.GetAllOrders()
	assert.Equal(t, 1, len(orders))

	// Get queue
	queue := s.GetQueue()
	assert.Equal(t, 1, len(queue))
}

func TestOrderService_BotManagement(t *testing.T) {
	s := NewOrderService()
	
	s.SetBotCount(3)
	assert.Equal(t, 3, len(s.GetBots()))

	s.SetBotCount(1)
	assert.Equal(t, 1, len(s.GetBots()))
}

func TestOrderService_Extra(t *testing.T) {
	s := NewOrderService()
	order := s.CreateOrder("Alice", domain.OrderTypeNormal)
	
	// Test GetQueue before bot starts
	assert.Equal(t, 1, len(s.GetQueue()))

	// Test SetBotCount and GetBots
	s.SetBotCount(1)
	assert.Equal(t, 1, len(s.GetBots()))

	// Test callbacks (manually trigger to ensure coverage)
	s.HandleOrderStart(order, 1)
	s.HandleOrderComplete(order)
	assert.Equal(t, domain.OrderStatusComplete, order.Status)

	order2 := s.CreateOrder("Bob", domain.OrderTypeNormal)
	s.HandleOrderCancelled(order2)
	assert.Equal(t, 2, len(s.GetQueue()))
}
