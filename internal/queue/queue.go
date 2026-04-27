package queue

import "github.com/feedmepos/order-controller/internal/model"

// PendingQueue maintains the invariant:
//
//	items[0..vipCount)  — VIP orders, sorted by ID ascending
//	items[vipCount..)   — Normal orders, sorted by ID ascending
type PendingQueue struct {
	items    []*model.Order
	vipCount int
}

func (q *PendingQueue) Len() int { return len(q.items) }

func (q *PendingQueue) AddVIP(o *model.Order) {
	q.insertAt(q.vipCount, o)
	q.vipCount++
}

func (q *PendingQueue) AddNormal(o *model.Order) {
	q.items = append(q.items, o)
}

func (q *PendingQueue) Pop() *model.Order {
	if len(q.items) == 0 {
		return nil
	}
	o := q.items[0]
	q.items = q.items[1:]
	if o.IsVIP {
		q.vipCount--
	}
	return o
}

// Requeue inserts an order back into its correct priority position.
// Used when a bot is removed mid-processing.
func (q *PendingQueue) Requeue(o *model.Order) {
	if o.IsVIP {
		pos := q.firstGreater(0, q.vipCount, o.ID)
		q.insertAt(pos, o)
		q.vipCount++
	} else {
		pos := q.firstGreater(q.vipCount, len(q.items), o.ID)
		q.insertAt(pos, o)
	}
}

// firstGreater returns the first index in [lo, hi) where items[i].ID > id,
// or hi if no such index exists.
func (q *PendingQueue) firstGreater(lo, hi, id int) int {
	for i := lo; i < hi; i++ {
		if q.items[i].ID > id {
			return i
		}
	}
	return hi
}

func (q *PendingQueue) insertAt(pos int, o *model.Order) {
	q.items = append(q.items, nil)
	copy(q.items[pos+1:], q.items[pos:])
	q.items[pos] = o
}
