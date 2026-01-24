package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type CreateOrderResult struct {
	Order              *entities.Order
	PendingCount       int
	NormalPendingCount int
}

type CreateOrderUseCase struct {
	orderRepo interfaces.OrderRepository
}

func NewCreateOrderUseCase(orderRepo interfaces.OrderRepository) *CreateOrderUseCase {
	return &CreateOrderUseCase{
		orderRepo: orderRepo,
	}
}

func (uc *CreateOrderUseCase) Execute(orderType entities.OrderType) (*CreateOrderResult, error) {
	order, err := uc.orderRepo.CreateOrder(orderType)
	if err != nil {
		return nil, err
	}

	pendingOrders := uc.orderRepo.GetPendingOrders()
	normalCount := countNormalOrders(pendingOrders)

	return &CreateOrderResult{
		Order:              order,
		PendingCount:       len(pendingOrders),
		NormalPendingCount: normalCount,
	}, nil
}

func countNormalOrders(orders []*entities.Order) int {
	count := 0
	for _, order := range orders {
		if order.Type == entities.OrderTypeNormal {
			count++
		}
	}
	return count
}
