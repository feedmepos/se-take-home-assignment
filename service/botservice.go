package service

import (
	"context"
	"log"
	"time"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/repository"
)

var botServicePtr BotService

type BotService interface {
	FindLast(context.Context) (*models.Bot, error)

	// 增加机器人
	Add(context.Context) error

	Delete(context.Context, *models.Bot) error

	ChangeStatusToCooking(context.Context, *models.Bot, *models.Order) error
	ChangeStatusToIdle(context.Context, *models.Bot) error

	Cook(context.Context, *models.Bot, *models.Order) error
}

func InitBotService() {
	botServicePtr = &BotServiceImpl{}
}

func GetBotService() BotService {
	return botServicePtr
}

type BotServiceImpl struct{}

func (BotServiceImpl) FindLast(ctx context.Context) (*models.Bot, error) {
	return repository.GetBotRepository().FindLast(ctx)
}

func (BotServiceImpl) Add(ctx context.Context) error {
	id := repository.GetBotRepository().GenerateID(ctx)

	cancelCtx, cancelFunc := context.WithCancel(ctx)

	bot := models.Bot{
		ID:                id,
		Status:            consts.BotStatusIdle,
		OrderID:           0,
		OrderProcessStart: nil,
		CancelCtx:         cancelCtx,
		CancelFunc:        cancelFunc,
	}

	if err := repository.GetBotRepository().Add(ctx, &bot); err != nil {
		return err
	}

	log.Printf("机器人 %d 添加成功\n", id)

	eventbus.PublishBotAdded(ctx, id)
	return nil
}

func (BotServiceImpl) Delete(ctx context.Context, bot *models.Bot) error {
	if bot == nil {
		return nil
	}

	bot.CancelFunc()

	if err := repository.GetBotRepository().Delete(ctx, bot); err != nil {
		return err
	}

	log.Printf("机器人 %d 删除成功\n", bot.ID)
	return nil
}

func (BotServiceImpl) Cook(ctx context.Context, bot *models.Bot, order *models.Order) error {
	log.Printf("机器人 %d 开始处理订单 %d\n", bot.ID, order.ID)

	bot.Lock()
	order.Lock()

	bot.OrderID = order.ID
	bot.Status = consts.BotStatusCooking

	order.BotID = bot.ID
	order.Status = consts.OrderStatusProcessing

	order.Unlock()
	bot.Unlock()

	var newOrderStatus consts.OrderStatus

	select {
	case <-time.After(10 * time.Second):
		newOrderStatus = consts.OrderStatusFinished
		order.Lock()
		order.Status = consts.OrderStatusFinished
		order.Unlock()
		break
	case <-order.CancelCtx.Done():
		newOrderStatus = consts.OrderStatusPending
		break
	}

	bot.Lock()
	bot.OrderID = 0
	bot.Status = consts.BotStatusIdle
	bot.Unlock()

	if newOrderStatus == consts.OrderStatusFinished {
		log.Printf("机器人 %d 处理完成订单 %d\n", bot.ID, order.ID)
	} else if newOrderStatus == consts.OrderStatusPending {
		log.Printf("机器人 %d 未完成订单 %d, 订单被取消\n", bot.ID, order.ID)
	}

	return nil
}

func (BotServiceImpl) ChangeStatusToCooking(ctx context.Context, bot *models.Bot, order *models.Order) error {
	if bot == nil {
		return errdef.ErrBotNotFound
	}

	if order == nil {
		return errdef.ErrOrderNotFound
	}

	bot.Lock()
	defer bot.Unlock()

	if bot.Status != consts.BotStatusIdle {
		return errdef.ErrBotStatusNotIdle
	}

	bot.Status = consts.BotStatusCooking
	bot.OrderID = order.ID

	return nil
}

func (BotServiceImpl) ChangeStatusToIdle(ctx context.Context, bot *models.Bot) error {
	if bot == nil {
		return errdef.ErrBotNotFound
	}

	bot.Lock()
	defer bot.Unlock()

	if bot.Status != consts.BotStatusCooking {
		return errdef.ErrBotStatusNotCooking
	}

	bot.Status = consts.BotStatusIdle
	bot.OrderID = 0

	return nil
}
