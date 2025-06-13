package repository

import (
	"container/list"
	"context"
	"log"
	"sync"
	"sync/atomic"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/models"
)

var botStoragePtr BotStorage

type BotStorage interface {
	Create(context.Context) (*models.Bot, error)

	LockAll(context.Context)
	UnlockAll(context.Context)

	FindByID(context.Context, int64) (*models.Bot, error)
	FindLast(context.Context) (*models.Bot, error)

	Add(context.Context, *models.Bot) error
	Delete(context.Context, *models.Bot) error
}

type BotPoolMemory struct {
	currentBotID int64

	Bots   *list.List
	BotMap map[int64]*models.Bot
	mutex  sync.Mutex
}

func InitBotRepository() {
	botStoragePtr = &BotPoolMemory{
		Bots:   list.New(),
		BotMap: make(map[int64]*models.Bot, 64),
	}
}

func GetBotRepository() BotStorage {
	return botStoragePtr
}

func (p *BotPoolMemory) GenerateID(ctx context.Context) int64 {
	return atomic.AddInt64(&p.currentBotID, 1)
}

func (p *BotPoolMemory) Create(ctx context.Context) (*models.Bot, error) {
	id := p.GenerateID(ctx)

	bot := models.Bot{
		ID:      id,
		Status:  consts.BotStatusIdle,
		OrderID: 0,
	}

	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	bot.E = p.Bots.PushBack(&bot)
	p.BotMap[bot.ID] = &bot

	log.Printf("机器人 %d 添加成功\n", id)
	return &bot, nil
}

func (p *BotPoolMemory) LockAll(context.Context) {
	p.mutex.Lock()
}
func (p *BotPoolMemory) UnlockAll(context.Context) {
	p.mutex.Unlock()
}

func (p *BotPoolMemory) Add(ctx context.Context, bot *models.Bot) error {
	if bot == nil {
		return nil
	}

	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	bot.E = p.Bots.PushBack(bot)
	p.BotMap[bot.ID] = bot
	return nil
}

func (p *BotPoolMemory) FindByID(ctx context.Context, id int64) (*models.Bot, error) {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	v, ok := p.BotMap[id]
	if !ok {
		return nil, nil
	}

	return v, nil
}

func (p *BotPoolMemory) FindLast(ctx context.Context) (*models.Bot, error) {
	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	e := p.Bots.Back()

	if e == nil {
		return nil, nil
	}

	return e.Value.(*models.Bot), nil
}

func (p *BotPoolMemory) Delete(ctx context.Context, bot *models.Bot) error {
	if bot == nil {
		return nil
	}

	p.LockAll(ctx)
	defer p.UnlockAll(ctx)

	p.Bots.Remove(bot.E)
	delete(p.BotMap, bot.ID)

	return nil
}
