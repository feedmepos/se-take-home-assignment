package usecases

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
)

type CompleteOrdersUseCase struct {
	botRepo   interfaces.BotRepository
	orderRepo interfaces.OrderRepository
}

type CompleteOrdersArgs struct {
	Assignments []*AssignOrdersRes
}

type CompleteOrdersRes struct {
	BotID int
	Order *entities.Order
}

func (uc *CompleteOrdersUseCase) Execute(args CompleteOrdersArgs) (res []*CompleteOrdersRes, err error) {
	var assignments = args.Assignments
	res = make([]*CompleteOrdersRes, 0)

	for _, r := range assignments {
		err = uc.orderRepo.UpdateOrderStatus(r.Order.ID, entities.OrderStatusComplete)
		if err != nil {
			return
		}
		err = uc.botRepo.UpdateBotStatus(r.BotID, false, 0)
		if err != nil {
			return
		}
		res = append(res, &CompleteOrdersRes{
			BotID: r.BotID,
			Order: uc.orderRepo.GetOrderByID(r.Order.ID),
		})
	}

	return
}

func NewCompleteOrdersUseCase(botRepo interfaces.BotRepository, orderRepo interfaces.OrderRepository) *CompleteOrdersUseCase {
	return &CompleteOrdersUseCase{
		botRepo:   botRepo,
		orderRepo: orderRepo,
	}
}
