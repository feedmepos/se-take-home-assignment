package listener

import (
	"context"
	"log"
	"time"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/repository"
	"idreamshen.com/fmcode/service"
)

func LoopProcessEventBotAdded(ctx context.Context) {
	for {
		select {
		case botID, _ := <-eventbus.GetBotAddedChan(ctx):
			if bot, err := repository.GetBotRepository().FindByID(ctx, botID); err != nil {
				// todo err ?
			} else {
				if bot == nil {
					log.Printf("Bot %d not found\n", botID)
					continue
				}

				go loopProcessEventOrderCreated(ctx, bot)
			}
		}
	}
}

func loopProcessEventOrderCreated(ctx context.Context, bot *models.Bot) {
	log.Printf("Bot %d entered order processing loop", bot.ID)

LOOP:
	for {
		select {
		case <-eventbus.GetOrderCreatedChan(ctx):
			log.Println("New order needs to be processed")
			if !processOrderCreated(ctx, bot) {
				break LOOP
			}
		case <-bot.CancelCtx.Done():
			log.Println("Bot need to cancel")
			break LOOP
		}
	}

	if err := service.GetBotService().Delete(ctx, bot); err != nil {
		log.Printf("Bot %d deletion failed: %s", bot.ID, err.Error())
	}

	log.Printf("Bot %d exited order processing loop\n", bot.ID)
}

// @Return processNext bool if need process next order
func processOrderCreated(ctx context.Context, bot *models.Bot) bool {
	var order *models.Order
	var err error

	if repository.GetOrderRepository().HasVipPending(ctx) {
		order, err = repository.GetOrderRepository().TakePending(ctx, consts.OrderPriorityVip)
	} else {
		order, err = repository.GetOrderRepository().TakePending(ctx, consts.OrderPriorityNormal)
	}

	if err != nil {
		log.Printf("Failed to get order: %s\n", err.Error())
		return true
	}

	if order == nil {
		log.Printf("No order found to process\n")
		return true
	}

	if processNext, err := botCookOrder(ctx, bot, order); err != nil {
		log.Printf("Bot %d failed to process order %d: %s\n", bot.ID, order.ID, err.Error())
		return true
	} else {
		return processNext
	}
}

// @Return processNext bool if need process next order
func botCookOrder(ctx context.Context, bot *models.Bot, order *models.Order) (bool, error) {
	var isCancelled = false

	if bot == nil {
		return false, errdef.ErrBotNotFound
	}

	if order == nil {
		return true, errdef.ErrOrderNotFound
	}

	log.Printf("Bot %d started processing order %d\n", bot.ID, order.ID)

	if err := service.GetBotService().ChangeStatusToCooking(ctx, bot, order); err != nil {
		return true, err
	}

	if err := service.GetOrderService().ChangeStatusToProcessing(ctx, order, bot); err != nil {
		return true, err
	}

	var newOrderStatus consts.OrderStatus

	select {
	case <-time.After(consts.OrderCookTime):
		newOrderStatus = consts.OrderStatusCompleted

		if err := service.GetOrderService().ChangeStatusToCompleted(ctx, order); err != nil {
			log.Printf("Cannot change order %d status to Completed: %s\n", order.ID, err.Error())
			return true, err
		}

		break
	case <-order.CancelCtx.Done():
		// Currently, if order is cancelled, we consider the bot is also deleted
		isCancelled = true
		newOrderStatus = consts.OrderStatusPending
		if err := service.GetOrderService().ResetOrder(ctx, order); err != nil {
			log.Printf("Cannot reset order %d status: %s\n", order.ID, err.Error())
			return false, err
		}
		break
	}

	if err := service.GetBotService().ChangeStatusToIdle(ctx, bot); err != nil {
		log.Printf("Cannot change bot status to IDLE: %s\n", err.Error())
		return !isCancelled, err
	}

	if newOrderStatus == consts.OrderStatusCompleted {
		log.Printf("Bot %d completed order %d\n", bot.ID, order.ID)
	} else if newOrderStatus == consts.OrderStatusPending {
		log.Printf("Bot %d did not complete order %d, order was cancelled\n", bot.ID, order.ID)
	}

	return !isCancelled, nil
}
