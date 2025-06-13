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
					log.Printf("机器人 %d 未找到\n", botID)
					continue
				}

				go loopProcessEventOrderCreated(ctx, bot)
			}
		}
	}
}

func loopProcessEventOrderCreated(ctx context.Context, bot *models.Bot) {
	log.Printf("机器人 %d 进入订单处理循环", bot.ID)

LOOP:
	for {
		select {
		case <-eventbus.GetOrderCreatedChan(ctx):
			log.Println("有新订单需要处理")
			processOrderCreated(ctx, bot)
			break LOOP
		}
	}

	if err := service.GetBotService().Delete(ctx, bot); err != nil {
		log.Printf("机器人 %d 删除失败: %s", bot.ID, err.Error())
	}

	log.Printf("机器人 %d 退出订单处理循环\n", bot.ID)
}

func processOrderCreated(ctx context.Context, bot *models.Bot) {
	var order *models.Order
	var err error

	if repository.GetOrderRepository().HasVipPending(ctx) {
		order, err = repository.GetOrderRepository().TakePending(ctx, consts.OrderPriorityVip)
	} else {
		order, err = repository.GetOrderRepository().TakePending(ctx, consts.OrderPriorityNormal)
	}

	if err != nil {
		log.Printf("获取订单失败: %s\n", err.Error())
		return
	}

	if order == nil {
		log.Printf("未找到需要处理的订单\n")
		return
	}

	if err := botCookOrder(ctx, bot, order); err != nil {
		log.Printf("机器人 %d 处理订单 %d 失败: %s\n", bot.ID, order.ID, err.Error())
	}
}

func botCookOrder(ctx context.Context, bot *models.Bot, order *models.Order) error {
	if bot == nil {
		return errdef.ErrBotNotFound
	}

	if order == nil {
		return errdef.ErrOrderNotFound
	}

	log.Printf("机器人 %d 开始处理订单 %d\n", bot.ID, order.ID)

	if err := service.GetBotService().ChangeStatusToCooking(ctx, bot, order); err != nil {
		return err
	}

	if err := service.GetOrderService().ChangeStatusToProcessing(ctx, order, bot); err != nil {
		return err
	}

	var newOrderStatus consts.OrderStatus

	select {
	case <-time.After(consts.OrderCookTime):
		newOrderStatus = consts.OrderStatusFinished

		if err := service.GetOrderService().ChangeStatusToFinish(ctx, order); err != nil {
			log.Printf("无法将订单 %d 状态修改为 Finished: %s\n", order.ID, err.Error())
			return err
		}

		break
	case <-order.CancelCtx.Done():
		newOrderStatus = consts.OrderStatusPending
		if err := service.GetOrderService().ResetOrder(ctx, order); err != nil {
			log.Printf("无法将订单 %d 状态重置: %s\n", order.ID, err.Error())
			return err
		}
		break
	}

	if err := service.GetBotService().ChangeStatusToIdle(ctx, bot); err != nil {
		log.Printf("无法将机器人状态修改为 IDLE: %s\n", err.Error())
		return err
	}

	if newOrderStatus == consts.OrderStatusFinished {
		log.Printf("机器人 %d 处理完成订单 %d\n", bot.ID, order.ID)
	} else if newOrderStatus == consts.OrderStatusPending {
		log.Printf("机器人 %d 未完成订单 %d, 订单被取消\n", bot.ID, order.ID)
	}

	return nil
}
