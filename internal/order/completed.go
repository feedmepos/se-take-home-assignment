package order

import "sync"

// Completed is the COMPLETE area: finished orders in completion order.
// Thread-safe: all methods take c.mu internally.
type Completed struct {
	mu     sync.Mutex
	orders []*Order
}

func NewCompleted() *Completed {
	return &Completed{orders: make([]*Order, 0)}
}

func (c *Completed) Add(order *Order) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.orders = append(c.orders, order)
}

func (c *Completed) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.orders)
}

func (c *Completed) IDs() []int {
	c.mu.Lock()
	defer c.mu.Unlock()
	ids := make([]int, len(c.orders))
	for i, o := range c.orders {
		ids[i] = o.ID
	}
	return ids
}

// CountsByType returns (vipCount, normalCount).
func (c *Completed) CountsByType() (vip, normal int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, o := range c.orders {
		if o.Type == VIP {
			vip++
		} else {
			normal++
		}
	}
	return vip, normal
}
