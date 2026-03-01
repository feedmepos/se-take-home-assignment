package mocks

import "feedme-takehome/domain/entities"

type MockOrderRepository struct {
	// Return values for each method
	CreateOrderFunc           func(orderType entities.OrderType) (*entities.Order, error)
	GetPendingOrdersFunc      func() []*entities.Order
	GetAllOrdersFunc          func() []*entities.Order
	GetOrderByIDFunc          func(orderID int) *entities.Order
	UpdateOrderStatusFunc     func(orderID int, status entities.OrderStatus) error
	ClaimNextPendingOrderFunc func() *entities.Order

	// Call tracking
	CreateOrderCalls           []entities.OrderType
	GetPendingOrdersCalls      int
	GetAllOrdersCalls          int
	GetOrderByIDCalls          []int
	UpdateOrderStatusCalls     []UpdateOrderStatusCall
	ClaimNextPendingOrderCalls int
}

type UpdateOrderStatusCall struct {
	OrderID int
	Status  entities.OrderStatus
}

func NewMockOrderRepository() *MockOrderRepository {
	return &MockOrderRepository{
		CreateOrderCalls:       []entities.OrderType{},
		GetOrderByIDCalls:      []int{},
		UpdateOrderStatusCalls: []UpdateOrderStatusCall{},
	}
}

func (m *MockOrderRepository) CreateOrder(orderType entities.OrderType) (*entities.Order, error) {
	m.CreateOrderCalls = append(m.CreateOrderCalls, orderType)
	if m.CreateOrderFunc != nil {
		return m.CreateOrderFunc(orderType)
	}
	return &entities.Order{
		ID:     len(m.CreateOrderCalls),
		Type:   orderType,
		Status: entities.OrderStatusPending,
	}, nil
}

func (m *MockOrderRepository) GetPendingOrders() []*entities.Order {
	m.GetPendingOrdersCalls++
	if m.GetPendingOrdersFunc != nil {
		return m.GetPendingOrdersFunc()
	}
	return []*entities.Order{}
}

func (m *MockOrderRepository) GetAllOrders() []*entities.Order {
	m.GetAllOrdersCalls++
	if m.GetAllOrdersFunc != nil {
		return m.GetAllOrdersFunc()
	}
	return []*entities.Order{}
}

func (m *MockOrderRepository) GetOrderByID(orderID int) *entities.Order {
	m.GetOrderByIDCalls = append(m.GetOrderByIDCalls, orderID)
	if m.GetOrderByIDFunc != nil {
		return m.GetOrderByIDFunc(orderID)
	}
	return nil
}

func (m *MockOrderRepository) UpdateOrderStatus(orderID int, status entities.OrderStatus) error {
	m.UpdateOrderStatusCalls = append(m.UpdateOrderStatusCalls, UpdateOrderStatusCall{
		OrderID: orderID,
		Status:  status,
	})
	if m.UpdateOrderStatusFunc != nil {
		return m.UpdateOrderStatusFunc(orderID, status)
	}
	return nil
}

func (m *MockOrderRepository) ClaimNextPendingOrder() *entities.Order {
	m.ClaimNextPendingOrderCalls++
	if m.ClaimNextPendingOrderFunc != nil {
		return m.ClaimNextPendingOrderFunc()
	}
	return nil
}

func (m *MockOrderRepository) Reset() {
	m.CreateOrderCalls = []entities.OrderType{}
	m.GetPendingOrdersCalls = 0
	m.GetAllOrdersCalls = 0
	m.GetOrderByIDCalls = []int{}
	m.UpdateOrderStatusCalls = []UpdateOrderStatusCall{}
	m.ClaimNextPendingOrderCalls = 0
}
