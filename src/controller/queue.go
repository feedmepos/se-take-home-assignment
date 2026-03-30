package controller

import "sync"

// OrderQueue 线程安全的双优先级 FIFO 订单队列
// VIP 队列优先于 Normal 队列，同类型内按 ID 升序（FIFO）
type OrderQueue struct {
	mu     sync.Mutex
	vip    []*Order
	normal []*Order
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{}
}

// Enqueue 将订单追加到对应优先级队列末尾
func (q *OrderQueue) Enqueue(order *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	switch order.Type {
	case OrderVIP:
		q.vip = append(q.vip, order)
	default:
		q.normal = append(q.normal, order)
	}
}

// Dequeue 取出最高优先级的订单
// VIP 队列非空时取 VIP，否则取 Normal，都为空返回 nil
func (q *OrderQueue) Dequeue() *Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.vip) > 0 {
		order := q.vip[0]
		q.vip = q.vip[1:]
		return order
	}
	if len(q.normal) > 0 {
		order := q.normal[0]
		q.normal = q.normal[1:]
		return order
	}
	return nil
}

// Return 将订单按 ID 插入回对应优先级队列的正确位置
// 同类型内编号小的排前面，保持 FIFO 顺序
func (q *OrderQueue) Return(order *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	insertOrdered := func(slice []*Order, o *Order) []*Order {
		for i, existing := range slice {
			if existing.ID > o.ID {
				// 在 i 处插入
				result := make([]*Order, 0, len(slice)+1)
				result = append(result, slice[:i]...)
				result = append(result, o)
				result = append(result, slice[i:]...)
				return result
			}
		}
		return append(slice, o)
	}

	switch order.Type {
	case OrderVIP:
		q.vip = insertOrdered(q.vip, order)
	default:
		q.normal = insertOrdered(q.normal, order)
	}
}

// Len 返回两个队列的长度
func (q *OrderQueue) Len() (vip int, normal int) {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.vip), len(q.normal)
}

// AllPending 返回所有待处理订单（VIP 在前，Normal 在后）
func (q *OrderQueue) AllPending() []*Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	result := make([]*Order, 0, len(q.vip)+len(q.normal))
	result = append(result, q.vip...)
	result = append(result, q.normal...)
	return result
}

// IsEmpty 判断队列是否为空
func (q *OrderQueue) IsEmpty() bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.vip) == 0 && len(q.normal) == 0
}
