package storage

import (
	"container/list"
	"context"
	"sync"
	"sync/atomic"

	"idreamshen.com/fmcode/models"
)

var botStoragePtr BotStorage

type BotStorage interface {
	GenerateID(context.Context) int64

	Lock(context.Context)
	Unlock(context.Context)

	FindByID(context.Context, int64) (*models.Bot, error)
	FindLast(context.Context) (*models.Bot, error)

	Add(context.Context, *models.Bot) error
	DecrLast(context.Context) (*models.Bot, error)
}

type BotPoolMemory struct {
	currentBotID int64

	Bots   *list.List
	BotMap map[int64]*models.Bot
	mutex  sync.Mutex
}

func InitBotStorage() {
	botStoragePtr = &BotPoolMemory{
		Bots:   list.New(),
		BotMap: make(map[int64]*models.Bot, 64),
	}
}

func GetBotStorage() BotStorage {
	return botStoragePtr
}

func (p *BotPoolMemory) GenerateID(ctx context.Context) int64 {
	return atomic.AddInt64(&p.currentBotID, 1)
}

func (p *BotPoolMemory) Lock(context.Context) {
	p.mutex.Lock()
}
func (p *BotPoolMemory) Unlock(context.Context) {
	p.mutex.Unlock()
}

func (p *BotPoolMemory) Add(ctx context.Context, bot *models.Bot) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	p.Bots.PushBack(bot)
	p.BotMap[bot.ID] = bot
	return nil
}

func (p *BotPoolMemory) FindByID(ctx context.Context, id int64) (*models.Bot, error) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	v, ok := p.BotMap[id]
	if !ok {
		return nil, nil
	}

	return v, nil
}

func (p *BotPoolMemory) FindLast(ctx context.Context) (*models.Bot, error) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	e := p.Bots.Back()

	if e == nil {
		return nil, nil
	}

	return e.Value.(*models.Bot), nil
}

func (p *BotPoolMemory) DecrLast(ctx context.Context) (*models.Bot, error) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	e := p.Bots.Back()

	if e == nil {
		return nil, nil
	}

	bot := e.Value.(*models.Bot)
	p.Bots.Remove(e)
	delete(p.BotMap, bot.ID)

	return bot, nil
}
