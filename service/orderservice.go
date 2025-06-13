package service

import (
	"context"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/repository"
)

var orderServicePtr OrderService

type OrderService interface {
	// int64 customerID
	Create(context.Context, int64, consts.OrderPriority) (int64, error)

	FindByID(context.Context, int64) (*models.Order, error)

	FindUncompleted(context.Context) ([]*models.Order, error)

	FindRecentCompleted(context.Context, int) ([]*models.Order, error)

	ChangeStatusToProcessing(context.Context, *models.Order, *models.Bot) error

	ChangeStatusToCompleted(context.Context, *models.Order) error

	// 将 order 重置
	ResetOrder(context.Context, *models.Order) error
}

func InitOrderService() {
	orderServicePtr = &orderServiceImpl{}
}

func GetOrderService() OrderService {
	return orderServicePtr
}

type orderServiceImpl struct{}

func (orderServiceImpl) Create(ctx context.Context, customerID int64, priority consts.OrderPriority) (int64, error) {

	if consts.OrderPriorityValidate(int(priority)) == false {
		return 0, errdef.ErrOrderPriorityInvalid
	}

	if order, err := repository.GetOrderRepository().CreatePending(ctx, customerID, priority); err != nil {
		return 0, err
	} else if order == nil {
		return 0, errdef.ErrOrderNotFound
	} else {
		eventbus.PublishOrderCreated(ctx, order.ID)
		return order.ID, nil
	}
}

func (orderServiceImpl) ResetOrder(ctx context.Context, order *models.Order) error {
	if order == nil {
		return nil
	}

	if err := repository.GetOrderRepository().ChangeStatusFromProcessingToPending(ctx, order); err != nil {
		return err
	}

	eventbus.PublishOrderCreated(ctx, order.ID)
	return nil
}

func (orderServiceImpl) FindByID(ctx context.Context, id int64) (*models.Order, error) {
	return repository.GetOrderRepository().FindByID(ctx, id)
}

func (orderServiceImpl) FindUncompleted(ctx context.Context) ([]*models.Order, error) {
	return repository.GetOrderRepository().FetchUncompleted(ctx)
}

func (orderServiceImpl) FindRecentCompleted(ctx context.Context, num int) ([]*models.Order, error) {
	return repository.GetOrderRepository().FetchRecentCompleted(ctx, num)
}

func (o orderServiceImpl) ChangeStatusToProcessing(ctx context.Context, order *models.Order, bot *models.Bot) error {
	return repository.GetOrderRepository().ChangeStatusToProcessing(ctx, order, bot)
}

func (o orderServiceImpl) ChangeStatusToCompleted(ctx context.Context, order *models.Order) error {
	return repository.GetOrderRepository().ChangeStatusToCompleted(ctx, order)
}
