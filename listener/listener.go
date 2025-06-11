package listener

import (
	"context"
	"fmt"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/service"
	"idreamshen.com/fmcode/storage"
)

func ProcessEventOrderCreated(ctx context.Context, bot *models.Bot) {
	for {
		select {
		case v, ok := <-eventbus.GetOrderCreatedChan(ctx):
			fmt.Printf("v=%v, ok=%v\n", v, ok)

			var order *models.Order
			var err error

			if storage.GetOrderStorage().HasVipOrder(ctx) {
				order, err = storage.GetOrderStorage().Take(ctx, consts.OrderPriorityVip)
			} else {
				order, err = storage.GetOrderStorage().Take(ctx, consts.OrderPriorityNormal)
			}

			if err != nil {
				// todo handle err
				panic(err)
				continue
			}

			if order == nil {
				continue
			}

			service.GetBotService().Cook(ctx, bot, order)

		}
	}

}

func ProcessEventBotAdded(ctx context.Context) {
	for {
		select {
		case botID, ok := <-eventbus.GetBotAddedChan(ctx):
			fmt.Printf("v=%v, ok=%v\n", botID, ok)

			if bot, err := storage.GetBotStorage().FindByID(ctx, botID); err != nil {
				// todo err ?
			} else {
				go ProcessEventOrderCreated(ctx, bot)
			}
		}
	}
}

func ProcessEventBotDecred(ctx context.Context) {
	for {
		select {
		case botID, ok := <-eventbus.GetBotDecredChan(ctx):
			fmt.Printf("v=%v, ok=%v\n", botID, ok)
			processBotDecred(ctx, botID)
		}
	}
}

func processBotDecred(ctx context.Context, botID int64) {
	storage.GetBotStorage().Lock(ctx)
	defer storage.GetBotStorage().Unlock(ctx)

	// 查找最新的
	if bot, err := storage.GetBotStorage().FindLast(ctx); err != nil {
		// todo err ?
	} else {
		switch bot.Status {
		case consts.BotStatusIdle:
			// 空闲直接删
			storage.GetBotStorage().DecrLast(ctx)
			break
		case consts.BotStatusCooking:
			// 制餐中，需要把订单状态还原
			orderID := bot.OrderID
			if order, err := storage.GetOrderStorage().FindByID(ctx, orderID); err != nil {
				// err ?
			} else {
				service.GetOrderService().ResetOrder(ctx, order)
			}

			break
		default:
			break
		}
	}

}
