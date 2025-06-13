package controller

import (
	"context"
	"log"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/service"
)

func AddBot(ctx context.Context) error {
	return service.GetBotService().Add(ctx)
}

func DecrBot(ctx context.Context) error {
	if bot, err := service.GetBotService().FindLast(ctx); err != nil {
		return err
	} else {
		if bot == nil {
			log.Printf("未找到机器人\n")
			return nil
		}

		switch bot.Status {
		case consts.BotStatusIdle:
			// 空闲直接删
			if err := service.GetBotService().Delete(ctx, bot); err != nil {
				log.Printf("删除机器人失败: %s", err.Error())
			}
			break
		case consts.BotStatusCooking:
			// 制餐中，需要把订单状态还原
			orderID := bot.OrderID
			if order, err := service.GetOrderService().FindByID(ctx, orderID); err != nil {
				// err ?
			} else {
				order.CancelFunc()
			}

			break
		default:
			break

		}
	}

	return nil
}
