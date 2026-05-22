package infrastructure

import (
	"errors"
	"sync"

	"mcdonalds-order-controller/domain"
)

type OrderRepository interface {
	Save(order *domain.Order) error
	FindByID(id uint64) (*domain.Order, error)
	FindAll() []*domain.Order
	FindByStatus(status domain.OrderStatus) []*domain.Order
	Update(order *domain.Order) error
}

type InMemoryOrderRepository struct {
	orders map[uint64]*domain.Order
	mu     sync.RWMutex
}

func NewInMemoryOrderRepository() *InMemoryOrderRepository {
	return &InMemoryOrderRepository{
		orders: make(map[uint64]*domain.Order),
	}
}

func (r *InMemoryOrderRepository) Save(order *domain.Order) error {
	if order == nil {
		return errors.New("order cannot be nil")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.orders[order.ID] = order
	return nil
}

func (r *InMemoryOrderRepository) FindByID(id uint64) (*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	order, exists := r.orders[id]
	if !exists {
		return nil, errors.New("order not found")
	}

	return order, nil
}

func (r *InMemoryOrderRepository) FindAll() []*domain.Order {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Order, 0, len(r.orders))
	for _, order := range r.orders {
		result = append(result, order)
	}

	return result
}

func (r *InMemoryOrderRepository) FindByStatus(status domain.OrderStatus) []*domain.Order {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Order, 0)
	for _, order := range r.orders {
		if order.Status == status {
			result = append(result, order)
		}
	}

	return result
}

func (r *InMemoryOrderRepository) Update(order *domain.Order) error {
	if order == nil {
		return errors.New("order cannot be nil")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.orders[order.ID]; !exists {
		return errors.New("order not found")
	}

	r.orders[order.ID] = order
	return nil
}
