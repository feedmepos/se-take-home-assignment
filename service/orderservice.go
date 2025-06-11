package service

import (
	"context"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/err"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/storage"
)

var orderServicePtr OrderService

type OrderService interface {
	// int64 customerID
	Create(context.Context, int64, consts.OrderPriority) (int64, error)

	FindByID(context.Context, int64) (*models.Order, error)

	FindUnfinished(context.Context) ([]*models.Order, error)

	FindRecentFinished(context.Context, int) ([]*models.Order, error)

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
		return 0, err.ErrOrderPriorityInvalid
	}

	orderID := storage.GetOrderStorage().GenerateID(ctx)

	order := models.Order{
		ID:         orderID,
		CustomerID: customerID,
		Priority:   priority,
		Status:     consts.OrderStatusPending,
		BotID:      0,
	}

	if err := storage.GetOrderStorage().Add(ctx, &order); err != nil {
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
		// todo warning
		return nil
	}

	order.Status = consts.OrderStatusPending
	order.BotID = 0

	storage.GetOrderStorage().Add(ctx, order)
	return nil
}

func (orderServiceImpl) FindByID(ctx context.Context, id int64) (*models.Order, error) {
	return nil, nil
}

func (orderServiceImpl) FindUnfinished(ctx context.Context) ([]*models.Order, error) {
	return nil, nil
}

func (orderServiceImpl) FindRecentFinished(ctx context.Context, num int) ([]*models.Order, error) {
	return nil, nil
}
