package listener

import (
	"context"
	"log"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/service"
	"idreamshen.com/fmcode/storage"
)

func ProcessEventOrderCreated(ctx context.Context, bot *models.Bot) {
	for {
		select {
		case <-eventbus.GetOrderCreatedChan(ctx):
			log.Println("新订单需要处理")

			var order *models.Order
			var err error

			if storage.GetOrderStorage().HasVipOrder(ctx) {
				order, err = storage.GetOrderStorage().Take(ctx, consts.OrderPriorityVip)
			} else {
				order, err = storage.GetOrderStorage().Take(ctx, consts.OrderPriorityNormal)
			}

			if err != nil {
				log.Printf("获取订单失败: %s\n", err.Error())
				continue
			}

			if order == nil {
				log.Printf("未找到需要处理的订单\n")
				continue
			}

			service.GetBotService().Cook(ctx, bot, order)

		}
	}

}

func ProcessEventBotAdded(ctx context.Context) {
	for {
		select {
		case botID, _ := <-eventbus.GetBotAddedChan(ctx):
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
		case botID, _ := <-eventbus.GetBotDecredChan(ctx):
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
