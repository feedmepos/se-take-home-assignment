package controller

import (
	"context"

	"idreamshen.com/fmcode/service"
	"idreamshen.com/fmcode/view"
)

func DisplayScreen(ctx context.Context) view.ScreenView {

	var screenView view.ScreenView

	uncompletedOrders, _ := service.GetOrderService().FindUncompleted(ctx)

	for _, order := range uncompletedOrders {
		screenView.Uncompleted = append(screenView.Uncompleted, order.ID)
	}

	recentCompletedOrders, _ := service.GetOrderService().FindRecentCompleted(ctx, 20)

	for _, order := range recentCompletedOrders {
		screenView.Completed = append(screenView.Completed, order.ID)
	}

	return screenView
}
