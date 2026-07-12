package controller

// PendingQueue 待处理订单队列，使用 VIP 与 Normal 两个独立子队列实现优先级。
// VIP 队列始终优先于 Normal 队列，同类型内按 FIFO 排列。
type PendingQueue struct {
	vipOrders    []*Order
	normalOrders []*Order
}

func (q *PendingQueue) Len() int {
	return len(q.vipOrders) + len(q.normalOrders)
}

// Orders 返回合并后的只读视图，VIP 在前 Normal 在后，便于外部检查队列内容。
func (q *PendingQueue) Orders() []*Order {
	combined := make([]*Order, 0, q.Len())
	combined = append(combined, q.vipOrders...)
	combined = append(combined, q.normalOrders...)
	return combined
}

// AddNormal 将普通订单追加到 Normal 队列末尾。
func (q *PendingQueue) AddNormal(order *Order) {
	q.normalOrders = append(q.normalOrders, order)
}

// AddVIP 将 VIP 订单追加到 VIP 队列末尾，保证 VIP 之间 FIFO 且整体优先于 Normal。
func (q *PendingQueue) AddVIP(order *Order) {
	q.vipOrders = append(q.vipOrders, order)
}

// ReturnOrder 将被中断处理的订单按其类型重新放回对应队列，保持 VIP 优先。
func (q *PendingQueue) ReturnOrder(order *Order) {
	if order.Type == VIP {
		q.AddVIP(order)
		return
	}
	q.AddNormal(order)
}

// Dequeue 优先从 VIP 队列取出，VIP 队列为空时再从 Normal 队列取出。
func (q *PendingQueue) Dequeue() *Order {
	if len(q.vipOrders) > 0 {
		order := q.vipOrders[0]
		q.vipOrders = q.vipOrders[1:]
		return order
	}
	if len(q.normalOrders) > 0 {
		order := q.normalOrders[0]
		q.normalOrders = q.normalOrders[1:]
		return order
	}
	return nil
}
