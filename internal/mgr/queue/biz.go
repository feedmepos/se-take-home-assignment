package queue

import (
	"container/heap"
	"sync"

	"github.com/se-take-home-assignment/internal/order"
)

type orderHeap []*order.Order

func (h orderHeap) Len() int { return len(h) }
func (h orderHeap) Less(i, j int) bool {
	if h[i].Priority() != h[j].Priority() {
		return h[i].Priority() < h[j].Priority()
	}
	return h[i].ID() < h[j].ID()
}
func (h orderHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }
func (h *orderHeap) Push(x any)   { *h = append(*h, x.(*order.Order)) }
func (h *orderHeap) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	old[n-1] = nil
	*h = old[:n-1]
	return x
}

type priorityQueue struct {
	mu         sync.Mutex
	cond       *sync.Cond
	pending    orderHeap
	processing []*order.Order
	completed  []*order.Order
}

func New() OrderQueue {
	q := &priorityQueue{}
	q.cond = sync.NewCond(&q.mu)
	heap.Init(&q.pending)
	return q
}

func (q *priorityQueue) Enqueue(o *order.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()
	heap.Push(&q.pending, o)
	q.cond.Signal()
}

func (q *priorityQueue) Dequeue(stopCh <-chan struct{}) *order.Order {
	done := make(chan struct{})
	defer close(done)

	go func() {
		select {
		case <-stopCh:
			q.mu.Lock()
			q.cond.Broadcast()
			q.mu.Unlock()
		case <-done:
		}
	}()

	q.mu.Lock()
	defer q.mu.Unlock()

	for len(q.pending) == 0 {
		q.cond.Wait()
		select {
		case <-stopCh:
			return nil
		default:
		}
	}

	o := heap.Pop(&q.pending).(*order.Order)
	q.processing = append(q.processing, o)
	return o
}

func (q *priorityQueue) RecycleOrder(o *order.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	q.removeFromProcessing(o)
	heap.Push(&q.pending, o)
	q.cond.Signal()
}

func (q *priorityQueue) CompleteOrder(o *order.Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	q.removeFromProcessing(o)
	q.completed = append(q.completed, o)
}

func (q *priorityQueue) removeFromProcessing(o *order.Order) {
	for i, cur := range q.processing {
		if cur.ID() == o.ID() {
			q.processing = append(q.processing[:i], q.processing[i+1:]...)
			return
		}
	}
}

func (q *priorityQueue) PendingOrders() []*order.Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.copyPending()
}

func (q *priorityQueue) ProcessingOrders() []*order.Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]*order.Order, len(q.processing))
	copy(result, q.processing)
	return result
}

func (q *priorityQueue) CompletedOrders() []*order.Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]*order.Order, len(q.completed))
	copy(result, q.completed)
	return result
}

func (q *priorityQueue) copyPending() []*order.Order {
	result := make([]*order.Order, len(q.pending))
	// Drain heap in sorted order
	tmp := make(orderHeap, len(q.pending))
	copy(tmp, q.pending)
	heap.Init(&tmp)
	for i := range result {
		result[i] = heap.Pop(&tmp).(*order.Order)
	}
	return result
}
