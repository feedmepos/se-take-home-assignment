package controller

type Kind string

const (
	Normal Kind = "Normal"
	VIP    Kind = "VIP"
)

type Status string

const (
	Pending    Status = "PENDING"
	Processing Status = "PROCESSING"
	Complete   Status = "COMPLETE"
)

type Order struct {
	ID     int
	Kind   Kind
	Status Status
}

func less(a, b *Order) bool {
	if a.Kind != b.Kind {
		return a.Kind == VIP
	}
	return a.ID < b.ID
}

func insertOrdered(orders []*Order, order *Order) []*Order {
	pos := len(orders)
	for i, existing := range orders {
		if less(order, existing) {
			pos = i
			break
		}
	}
	orders = append(orders, nil)
	copy(orders[pos+1:], orders[pos:])
	orders[pos] = order
	return orders
}

type OrderView struct {
	ID     int
	Kind   Kind
	Status Status
}

func viewOrder(order *Order) OrderView {
	return OrderView{
		ID:     order.ID,
		Kind:   order.Kind,
		Status: order.Status,
	}
}
