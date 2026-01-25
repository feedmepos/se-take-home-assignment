package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type CreateOrderUseCase struct {
	orderRepo interfaces.OrderRepository
}

type CreateOrderArgs struct {
	OrderType entities.OrderType
}

type CreateOrderRes struct {
	Order              *entities.Order
	PendingCount       int
	NormalPendingCount int
}

func (uc *CreateOrderUseCase) Execute(args CreateOrderArgs) (res *CreateOrderRes, err error) {
	order, err := uc.orderRepo.CreateOrder(args.OrderType)
	if err != nil {
		return
	}

	pendingOrders := uc.orderRepo.GetPendingOrders()
	normalCount := countNormalOrders(pendingOrders)

	res = &CreateOrderRes{
		Order:              order,
		PendingCount:       len(pendingOrders),
		NormalPendingCount: normalCount,
	}

	return
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

func NewCreateOrderUseCase(orderRepo interfaces.OrderRepository) *CreateOrderUseCase {
	return &CreateOrderUseCase{
		orderRepo: orderRepo,
	}
}
