package order

import "container/heap"

type heapItem struct {
	Order *Order
	seq   uint64
}

type innerPQ []*heapItem

func (pq innerPQ) Len() int { return len(pq) }

func (pq innerPQ) Less(i, j int) bool {
	if pq[i].Order.Type != pq[j].Order.Type {
		return pq[i].Order.Type > pq[j].Order.Type
	}
	return pq[i].seq < pq[j].seq
}

func (pq innerPQ) Swap(i, j int) { pq[i], pq[j] = pq[j], pq[i] }

func (pq *innerPQ) Push(x any) { *pq = append(*pq, x.(*heapItem)) }

func (pq *innerPQ) Pop() any {
	n := len(*pq)
	x := (*pq)[n-1]
	(*pq)[n-1] = nil
	*pq = (*pq)[:n-1]
	return x
}

type Queue struct {
	inner innerPQ
	seq   uint64
}

func NewQueue() *Queue { q := &Queue{}; heap.Init(&q.inner); return q }

func (q *Queue) Push(o *Order) {
	q.seq++
	heap.Push(&q.inner, &heapItem{Order: o, seq: q.seq})
}

func (q *Queue) Pop() *Order {
	if len(q.inner) == 0 {
		return nil
	}
	hi := heap.Pop(&q.inner).(*heapItem)
	hi.Order.seq = hi.seq
	return hi.Order
}

func (q *Queue) PushReturn(o *Order) {
	heap.Push(&q.inner, &heapItem{Order: o, seq: o.seq})
}

func (q *Queue) RemoveAt(i int) *Order { return heap.Remove(&q.inner, i).(*heapItem).Order }

func (q *Queue) Len() int { return len(q.inner) }
