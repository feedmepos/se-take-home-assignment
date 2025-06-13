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
			log.Printf("Bot not found\n")
			return nil
		}

		switch bot.Status {
		case consts.BotStatusIdle:
			// Delete directly if idle
			if err := service.GetBotService().Delete(ctx, bot); err != nil {
				log.Printf("Failed to delete bot: %s", err.Error())
			}
			break
		case consts.BotStatusCooking:
			// If cooking, need to restore order status
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
