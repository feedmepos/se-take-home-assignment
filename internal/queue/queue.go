// Package queue implements a priority order queue with VIP-first semantics.
// Whenever possible, internal FIFO ordering is maintained within each priority tier.
// Thread safety is the caller's responsibility (Controller holds the lock).
package queue

import "github.com/feedme/se-take-home-assignment/internal/model"

// PriorityQueue stores orders in two tiers: VIP and Normal.
// Dequeue always returns VIP orders first; within each tier, orders are FIFO.
type PriorityQueue struct {
	vipQ    []*model.Order
	normalQ []*model.Order
	nextID  int
}

// NewQueue creates an empty PriorityQueue with order IDs starting at 1001.
func NewQueue() *PriorityQueue {
	return &PriorityQueue{
		nextID: 1001,
	}
}

// IsEmpty returns true when no pending orders exist in either tier.
func (q *PriorityQueue) IsEmpty() bool {
	return len(q.vipQ) == 0 && len(q.normalQ) == 0
}

// Len returns the total number of pending orders across both tiers.
func (q *PriorityQueue) Len() int {
	return len(q.vipQ) + len(q.normalQ)
}

// NextID returns and increments the next available order ID.
func (q *PriorityQueue) NextID() int {
	id := q.nextID
	q.nextID++
	return id
}

// Enqueue adds an order to the tail of its priority tier.
func (q *PriorityQueue) Enqueue(order *model.Order) {
	if order.Type == model.OrderVIP {
		q.vipQ = append(q.vipQ, order)
	} else {
		q.normalQ = append(q.normalQ, order)
	}
}

// Dequeue removes and returns the highest-priority order.
// VIP orders are returned first (FIFO within VIP), then Normal orders (FIFO).
// Returns nil if the queue is empty.
func (q *PriorityQueue) Dequeue() *model.Order {
	if len(q.vipQ) > 0 {
		o := q.vipQ[0]
		q.vipQ = q.vipQ[1:]
		return o
	}
	if len(q.normalQ) > 0 {
		o := q.normalQ[0]
		q.normalQ = q.normalQ[1:]
		return o
	}
	return nil
}

// RollbackToFront re-inserts an order at the front of its priority tier.
// This is used when a bot is destroyed while processing — the order
// returns to its original position (front of its tier).
func (q *PriorityQueue) RollbackToFront(order *model.Order) {
	if order.Type == model.OrderVIP {
		q.vipQ = append([]*model.Order{order}, q.vipQ...)
	} else {
		q.normalQ = append([]*model.Order{order}, q.normalQ...)
	}
}
