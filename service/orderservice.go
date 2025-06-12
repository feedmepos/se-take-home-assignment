package service

import (
	"context"
	"log"

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

	FindUnfinished(context.Context) ([]*models.Order, error)

	FindRecentFinished(context.Context, int) ([]*models.Order, error)

	ChangeStatusToProcessing(context.Context, *models.Order, *models.Bot) error

	ChangeStatusToFinish(context.Context, *models.Order) error

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

	orderID := repository.GetOrderRepository().GenerateID(ctx)

	cancelCtx, cancelFunc := context.WithCancel(ctx)

	order := models.Order{
		ID:         orderID,
		CustomerID: customerID,
		Priority:   priority,
		Status:     consts.OrderStatusPending,
		BotID:      0,

		CancelCtx:  cancelCtx,
		CancelFunc: cancelFunc,
	}

	if err := repository.GetOrderRepository().Add(ctx, &order); err != nil {
		return 0, err
	}

	eventbus.PublishOrderCreated(ctx, order.ID)

	return orderID, nil
}

func (orderServiceImpl) ResetOrder(ctx context.Context, order *models.Order) error {
	if order == nil {
		return nil
	}

	order.Lock()
	defer order.Unlock()

	if order.Status != consts.OrderStatusProcessing {
		log.Printf("Order %d status is not processing, ignore reset", order.ID)
		return nil
	}

	order.Status = consts.OrderStatusPending
	order.BotID = 0

	order.CancelFunc()

	return repository.GetOrderRepository().Add(ctx, order)
}

func (orderServiceImpl) FindByID(ctx context.Context, id int64) (*models.Order, error) {
	return repository.GetOrderRepository().FindByID(ctx, id)
}

func (orderServiceImpl) FindUnfinished(ctx context.Context) ([]*models.Order, error) {
	return nil, nil
}

func (orderServiceImpl) FindRecentFinished(ctx context.Context, num int) ([]*models.Order, error) {
	return nil, nil
}

func (o orderServiceImpl) ChangeStatusToProcessing(ctx context.Context, order *models.Order, bot *models.Bot) error {

	if order == nil {
		return errdef.ErrOrderNotFound
	}

	if bot == nil {
		return errdef.ErrBotNotFound
	}

	order.Lock()
	defer order.Unlock()

	if order.Status != consts.OrderStatusPending {
		return errdef.ErrOrderStatusNotMatch
	}

	order.Status = consts.OrderStatusProcessing
	order.BotID = bot.ID

	return nil
}

func (o orderServiceImpl) ChangeStatusToFinish(ctx context.Context, order *models.Order) error {
	if order == nil {
		return errdef.ErrOrderNotFound
	}

	order.Lock()
	defer order.Unlock()

	if order.Status != consts.OrderStatusProcessing {
		return errdef.ErrOrderStatusNotMatch
	}

	order.Status = consts.OrderStatusFinished
	return nil
}
