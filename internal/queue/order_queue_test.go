package queue

import (
	"testing"
	"github.com/hwakman/se-take-home-assignment/internal/domain"
	"github.com/stretchr/testify/assert"
)

func TestOrderQueue_PushPop(t *testing.T) {
	q := NewOrderQueue()

	order1 := &domain.Order{ID: 1, OrderType: domain.OrderTypeNormal}
	order2 := &domain.Order{ID: 2, OrderType: domain.OrderTypeVIP}
	order3 := &domain.Order{ID: 3, OrderType: domain.OrderTypeNormal}
	order4 := &domain.Order{ID: 4, OrderType: domain.OrderTypeVIP}

	q.Push(order1)
	q.Push(order2)
	q.Push(order3)
	q.Push(order4)

	// Expected order: VIP 2, VIP 4, Normal 1, Normal 3
	assert.Equal(t, order2, q.Pop())
	assert.Equal(t, order4, q.Pop())
	assert.Equal(t, order1, q.Pop())
	assert.Equal(t, order3, q.Pop())
	assert.Nil(t, q.Pop())
}

func TestOrderQueue_Remove(t *testing.T) {
	q := NewOrderQueue()
	order1 := &domain.Order{ID: 1, OrderType: domain.OrderTypeNormal}
	order2 := &domain.Order{ID: 2, OrderType: domain.OrderTypeNormal}
	
	q.Push(order1)
	q.Push(order2)
	
	assert.True(t, q.Remove(1))
	assert.Equal(t, 1, q.Len())
	assert.Equal(t, order2, q.Pop())
	assert.False(t, q.Remove(99))
}

func TestOrderQueue_GetAll(t *testing.T) {
	q := NewOrderQueue()
	order1 := &domain.Order{ID: 1, OrderType: domain.OrderTypeNormal}
	q.Push(order1)
	
	orders := q.GetAll()
	assert.Equal(t, 1, len(orders))
	assert.Equal(t, order1, orders[0])
}
