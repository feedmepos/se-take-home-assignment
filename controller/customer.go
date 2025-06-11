package controller

import (
	"context"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/service"
)

// return orderID
func CreateOrder(ctx context.Context, customerID int64, priority consts.OrderPriority) int64 {
	orderID := service.GetOrderService().Create(ctx, customerID, priority)
	return orderID
}

func GetOrderStatus(ctx context.Context, customerID int64, orderID int64) (bool, consts.OrderStatus) {
	order, err := service.GetOrderService().FindByID(ctx, orderID)
	if err != nil {
		// todo
		return false, consts.OrderStatusPending
	}

	if order == nil {
		// todo not found
		return false, consts.OrderStatusPending
	}

	if order.CustomerID != customerID {
		// todo not allow
		return false, consts.OrderStatusPending
	}

	return true, order.Status
}
