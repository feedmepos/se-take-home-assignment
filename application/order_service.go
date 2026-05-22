package application

import (
	"mcdonalds-order-controller/domain"
	"mcdonalds-order-controller/infrastructure"
)

type OrderService struct {
	idGenerator *infrastructure.Snowflake
	scheduler   *domain.BotScheduler
}

func NewOrderService(idGenerator *infrastructure.Snowflake, scheduler *domain.BotScheduler) *OrderService {
	return &OrderService{
		idGenerator: idGenerator,
		scheduler:   scheduler,
	}
}

func (s *OrderService) CreateNormalOrder() (*domain.Order, error) {
	id, err := s.idGenerator.NextID()
	if err != nil {
		return nil, err
	}

	order := domain.NewOrder(id, domain.Normal)
	s.scheduler.SubmitOrder(order)

	return order, nil
}

func (s *OrderService) CreateVIPOrder() (*domain.Order, error) {
	id, err := s.idGenerator.NextID()
	if err != nil {
		return nil, err
	}

	order := domain.NewOrder(id, domain.VIP)
	s.scheduler.SubmitOrder(order)

	return order, nil
}

func (s *OrderService) GetPendingOrders() []*domain.Order {
	return s.scheduler.GetPendingOrders()
}

func (s *OrderService) GetCompleteOrders() []*domain.Order {
	return s.scheduler.GetCompleteOrders()
}
