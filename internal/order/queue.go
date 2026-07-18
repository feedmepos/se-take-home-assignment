package order

type OrderQueue struct {
	vipQueue  []int          // Saves only order IDs
	normQueue []int          // Saves only order IDs
	orders    map[int]*Order // Globally tracks all orders in the system
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{
		vipQueue:  make([]int, 0),
		normQueue: make([]int, 0),
		orders:    make(map[int]*Order),
	}
}

// Push registers and inserts a new order at the end of its respective priority queue
func (q *OrderQueue) Push(ord *Order) {
	q.orders[ord.ID] = ord
	if ord.Type == OrderTypeVIP {
		q.vipQueue = append(q.vipQueue, ord.ID)
	} else {
		q.normQueue = append(q.normQueue, ord.ID)
	}
}

// PushFront inserts an order back to the front of its respective queue (used for interrupted orders)
func (q *OrderQueue) PushFront(ord *Order) {
	q.orders[ord.ID] = ord
	if ord.Type == OrderTypeVIP {
		q.vipQueue = append([]int{ord.ID}, q.vipQueue...)
	} else {
		q.normQueue = append([]int{ord.ID}, q.normQueue...)
	}
}

// Pop retrieves and removes the highest priority order ID from the queue and returns the order
func (q *OrderQueue) Pop() (*Order, bool) {
	var id int
	if len(q.vipQueue) > 0 {
		id = q.vipQueue[0]
		q.vipQueue = q.vipQueue[1:]
	} else if len(q.normQueue) > 0 {
		id = q.normQueue[0]
		q.normQueue = q.normQueue[1:]
	} else {
		return nil, false
	}

	return q.orders[id], true
}

// Len returns the total number of pending orders
func (q *OrderQueue) Len() int {
	return len(q.vipQueue) + len(q.normQueue)
}

// VIPLen returns the number of pending VIP orders
func (q *OrderQueue) VIPLen() int {
	return len(q.vipQueue)
}

// NormLen returns the number of pending Normal orders
func (q *OrderQueue) NormLen() int {
	return len(q.normQueue)
}
