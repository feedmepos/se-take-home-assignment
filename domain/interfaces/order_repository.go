package interfaces

import "feedme-takehome/domain/entities"

type OrderRepository interface {
	CreateOrder(orderType entities.OrderType) (*entities.Order, error)
	GetPendingOrders() []*entities.Order
	GetAllOrders() []*entities.Order
	GetOrderByID(orderID int) *entities.Order
	UpdateOrderStatus(orderID int, status entities.OrderStatus) error
	ClaimNextPendingOrder() *entities.Order
}
