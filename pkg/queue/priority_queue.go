// Package queue provides a generic priority queue built on container/heap.
package queue

import (
	"container/heap"
	"sort"
)

// PriorityQueue is a generic priority queue ordered by a caller-supplied
// less function. It is NOT thread-safe: concurrent callers must provide
// their own locking (e.g. a mutex in the owning repository).
type PriorityQueue[T any] struct {
	h *innerHeap[T]
}

// New creates an empty PriorityQueue ordered by less. less(a, b) should
// report whether a has strictly higher priority than b (i.e. a should be
// popped before b).
func New[T any](less func(a, b T) bool) *PriorityQueue[T] {
	return &PriorityQueue[T]{
		h: &innerHeap[T]{
			items: nil,
			less:  less,
		},
	}
}

// Push adds v to the queue.
func (pq *PriorityQueue[T]) Push(v T) {
	heap.Push(pq.h, v)
}

// Pop removes and returns the highest-priority item. ok is false if the
// queue is empty, in which case the returned value is the zero value of T.
func (pq *PriorityQueue[T]) Pop() (v T, ok bool) {
	if pq.h.Len() == 0 {
		return v, false
	}
	return heap.Pop(pq.h).(T), true
}

// Peek returns the highest-priority item without removing it. ok is false
// if the queue is empty.
func (pq *PriorityQueue[T]) Peek() (v T, ok bool) {
	if pq.h.Len() == 0 {
		return v, false
	}
	return pq.h.items[0], true
}

// Len returns the number of items currently in the queue.
func (pq *PriorityQueue[T]) Len() int {
	return pq.h.Len()
}

// Items returns a snapshot of all items in priority order (highest priority
// first), without mutating the queue. It sorts a copy of the underlying
// slice with the queue's own comparator — same O(n log n) as draining a
// scratch heap, but with a single allocation and none of the per-item
// interface boxing heap.Pop incurs.
func (pq *PriorityQueue[T]) Items() []T {
	n := pq.h.Len()
	if n == 0 {
		return []T{}
	}

	out := make([]T, n)
	copy(out, pq.h.items)
	sort.Slice(out, func(i, j int) bool { return pq.h.less(out[i], out[j]) })
	return out
}

// innerHeap adapts a slice + less func to container/heap.Interface.
type innerHeap[T any] struct {
	items []T
	less  func(a, b T) bool
}

func (h *innerHeap[T]) Len() int { return len(h.items) }

func (h *innerHeap[T]) Less(i, j int) bool { return h.less(h.items[i], h.items[j]) }

func (h *innerHeap[T]) Swap(i, j int) { h.items[i], h.items[j] = h.items[j], h.items[i] }

func (h *innerHeap[T]) Push(x any) {
	h.items = append(h.items, x.(T))
}

func (h *innerHeap[T]) Pop() any {
	old := h.items
	n := len(old)
	v := old[n-1]
	// Zero the vacated slot: T may contain pointers, and without this the
	// backing array would retain them, blocking GC until overwritten.
	var zero T
	old[n-1] = zero
	h.items = old[:n-1]
	return v
}
