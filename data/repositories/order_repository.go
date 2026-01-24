package repositories

import (
	"feedme-takehome/data/models"
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
	"sync"
	"time"
)

type InMemoryOrderRepository struct {
	orders      []*models.OrderModel
	nextOrderID int
	mu          sync.RWMutex
}

func NewInMemoryOrderRepository() interfaces.OrderRepository {
	return &InMemoryOrderRepository{
		orders:      make([]*models.OrderModel, 0),
		nextOrderID: 1,
	}
}

func (r *InMemoryOrderRepository) CreateOrder(orderType entities.OrderType) (*entities.Order, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	orderModel := &models.OrderModel{
		ID:        r.nextOrderID,
		Type:      string(orderType),
		CreatedAt: time.Now(),
		Status:    string(entities.OrderStatusPending),
	}

	r.nextOrderID++
	r.orders = append(r.orders, orderModel)

	return orderModel.ToEntity(), nil
}

func (r *InMemoryOrderRepository) GetPendingOrders() []*entities.Order {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var pending []*models.OrderModel
	for _, order := range r.orders {
		if order.Status == string(entities.OrderStatusPending) {
			pending = append(pending, order)
		}
	}

	var vipOrders []*models.OrderModel
	var normalOrders []*models.OrderModel

	for _, order := range pending {
		if order.Type == string(entities.OrderTypeVIP) {
			vipOrders = append(vipOrders, order)
		} else {
			normalOrders = append(normalOrders, order)
		}
	}

	result := make([]*entities.Order, 0, len(pending))
	for _, orderModel := range vipOrders {
		result = append(result, orderModel.ToEntity())
	}
	for _, orderModel := range normalOrders {
		result = append(result, orderModel.ToEntity())
	}

	return result
}

func (r *InMemoryOrderRepository) GetAllOrders() []*entities.Order {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entities.Order, 0, len(r.orders))
	for _, orderModel := range r.orders {
		result = append(result, orderModel.ToEntity())
	}
	return result
}

func (r *InMemoryOrderRepository) GetOrderByID(orderID int) *entities.Order {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, order := range r.orders {
		if order.ID == orderID {
			return order.ToEntity()
		}
	}
	return nil
}

func (r *InMemoryOrderRepository) UpdateOrderStatus(orderID int, status entities.OrderStatus) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, order := range r.orders {
		if order.ID == orderID {
			order.Status = string(status)
			if status == entities.OrderStatusComplete {
				now := time.Now()
				order.CompletedAt = &now
			}
			return nil
		}
	}

	return nil
}

func (r *InMemoryOrderRepository) ClaimNextPendingOrder() *entities.Order {
	r.mu.Lock()
	defer r.mu.Unlock()

	var vipOrders []*models.OrderModel
	var normalOrders []*models.OrderModel

	for _, order := range r.orders {
		if order.Status == string(entities.OrderStatusPending) {
			if order.Type == string(entities.OrderTypeVIP) {
				vipOrders = append(vipOrders, order)
			} else {
				normalOrders = append(normalOrders, order)
			}
		}
	}

	var nextOrderModel *models.OrderModel
	if len(vipOrders) > 0 {
		nextOrderModel = vipOrders[0]
	} else if len(normalOrders) > 0 {
		nextOrderModel = normalOrders[0]
	}

	if nextOrderModel != nil {
		nextOrderModel.Status = string(entities.OrderStatusProcessing)
		now := time.Now()
		nextOrderModel.ProcessingStartedAt = &now
		return nextOrderModel.ToEntity()
	}

	return nil
}
