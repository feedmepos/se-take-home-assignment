package mcd

import "fmt"

// Priority represents order priority
type Priority int

const (
	Normal Priority = 0
	VIP    Priority = 1
)

// Order represents a customer order
type Order struct {
	ID       int
	Priority Priority
}

func (o *Order) String() string {
	prio := "NORMAL"
	if o.Priority == VIP {
		prio = "VIP"
	}
	return fmt.Sprintf("#%d (%s)", o.ID, prio)
}

// insertSorted inserts order into slice maintaining (priority DESC, id ASC) order
func insertSorted(orders []*Order, order *Order) []*Order {
	// Binary search for insertion point
	left, right := 0, len(orders)
	for left < right {
		mid := (left + right) / 2
		if less(order, orders[mid]) {
			right = mid
		} else {
			left = mid + 1
		}
	}
	// Insert at position left
	orders = append(orders, nil)
	copy(orders[left+1:], orders[left:])
	orders[left] = order
	return orders
}

// fewer returns true if a should come before b in queue
// Sort key: (priority DESC, id ASC)
func less(a, b *Order) bool {
	if a.Priority != b.Priority {
		return a.Priority > b.Priority // VIP (1) before Normal (0)
	}
	return a.ID < b.ID // Earlier ID first
}
