package service

import (
	"context"
	"log"

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
	if bot, err := repository.GetBotRepository().Create(ctx); err != nil {
		return err
	} else {
		eventbus.PublishBotAdded(ctx, bot.ID)
		return nil
	}
}

func (BotServiceImpl) Delete(ctx context.Context, bot *models.Bot) error {
	if bot == nil {
		return nil
	}

	if err := repository.GetBotRepository().Delete(ctx, bot); err != nil {
		return err
	}

	log.Printf("机器人 %d 删除成功\n", bot.ID)
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
