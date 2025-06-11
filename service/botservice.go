package service

import (
	"context"
	"log"
	"time"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/storage"
)

var botServicePtr BotService

type BotService interface {
	// 增加机器人
	Add(context.Context) error

	// 减少机器人
	// 自动移除最新加入的机器人
	Decr(context.Context) error

	Cook(context.Context, *models.Bot, *models.Order) error
}

func InitBotService() {
	botServicePtr = &BotServiceImpl{}
}

func GetBotService() BotService {
	return botServicePtr
}

type BotServiceImpl struct{}

func (BotServiceImpl) Add(ctx context.Context) error {
	id := storage.GetBotStorage().GenerateID(ctx)

	bot := models.Bot{
		ID:                id,
		Status:            consts.BotStatusIdle,
		OrderID:           0,
		OrderProcessStart: nil,
	}

	if err := storage.GetBotStorage().Add(ctx, &bot); err != nil {
		return err
	}

	log.Printf("机器人 %d 添加成功\n", id)

	eventbus.PublishBotAdded(ctx, id)
	return nil
}

func (BotServiceImpl) Decr(ctx context.Context) error {
	if _, err := storage.GetBotStorage().DecrLast(ctx); err != nil {
		return err
	}

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

	time.Sleep(time.Second * 10)

	bot.Lock()
	order.Lock()

	bot.OrderID = 0
	bot.Status = consts.BotStatusIdle
	order.Status = consts.OrderStatusFinished

	order.Unlock()
	bot.Unlock()

	log.Printf("机器人 %d 处理完成订单 %d\n", bot.ID, order.ID)
	return nil
}
