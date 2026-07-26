package memory

import (
	"container/list"
	"github.com/feedmepos/se-take-home-assignment/internal/domain"
)

type QueueRepo struct {
	pending *list.List
}

func NewQueueRepo() *QueueRepo {
	return &QueueRepo{
		pending: list.New(),
	}
}

func (q *QueueRepo) Queue(order *domain.Order) {
	q.pending.PushBack(order)
}

func (q *QueueRepo) Shift() *domain.Order {
	front := q.pending.Front()
	if front == nil {
		return nil
	}

	q.pending.Remove(front)

	return front.Value.(*domain.Order)
}

func (q *QueueRepo) UnShift(order *domain.Order) {
	q.pending.PushFront(order)
}

func (q *QueueRepo) GetPending() *list.List {
	return q.pending
}
