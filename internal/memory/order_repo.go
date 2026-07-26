package memory

import (
	"github.com/feedmepos/se-take-home-assignment/internal/domain"
)

type OrderRepo struct {
	completedOrders map[domain.OrderType][]*domain.Order
}

var (
	incrVIP    uint
	incrNormal uint
)

func NewOrderRepo() *OrderRepo {
	return &OrderRepo{
		completedOrders: make(map[domain.OrderType][]*domain.Order),
	}
}

func (r *OrderRepo) Create(t domain.OrderType) *domain.Order {
	var id uint
	if t == domain.OrderTypeVIP {
		incrVIP++
		id = incrVIP
	} else {
		incrNormal++
		id = incrNormal
	}

	return domain.NewOrder(id, t)
}

func (r *OrderRepo) UpdateStatus(order *domain.Order, status domain.OrderStatus) {
	order.Status = status

	if order.IsCompleted() {
		r.completedOrders[order.Type] = append(r.completedOrders[order.Type], order)
	}
}

func (r *OrderRepo) GetCompletedOrders(t domain.OrderType) []*domain.Order {
	return r.completedOrders[t]
}
