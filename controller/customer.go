package controller

import (
	"context"
	"log"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/service"
	"idreamshen.com/fmcode/view"
)

// return orderID
func CreateOrder(ctx context.Context, customerID int64, priority consts.OrderPriority) (view.CreateOrderView, error) {
	orderID, err := service.GetOrderService().Create(ctx, customerID, priority)
	if err != nil {
		return view.CreateOrderView{}, err
	}

	return view.CreateOrderView{
		OrderID: orderID,
	}, nil
}

func GetOrderStatus(ctx context.Context, customerID int64, orderID int64) (bool, consts.OrderStatus) {
	order, err := service.GetOrderService().FindByID(ctx, orderID)
	if err != nil {
		log.Println("Error querying order", err)
		return false, consts.OrderStatusPending
	}

	if order == nil {
		return false, consts.OrderStatusPending
	}

	if order.CustomerID != customerID {
		return false, consts.OrderStatusPending
	}

	return true, order.Status
}
