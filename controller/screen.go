package controller

import (
	"context"

	"idreamshen.com/fmcode/service"
	"idreamshen.com/fmcode/view"
)

func DisplayScreen(ctx context.Context) view.ScreenView {

	var screenView view.ScreenView

	unfinishedOrders, _ := service.GetOrderService().FindUnfinished(ctx)

	for _, order := range unfinishedOrders {
		screenView.Uncompleted = append(screenView.Uncompleted, order.ID)
	}

	recentFinishedOrders, _ := service.GetOrderService().FindRecentFinished(ctx, 10)

	for _, order := range recentFinishedOrders {
		screenView.Completed = append(screenView.Completed, order.ID)
	}

	return screenView
}
