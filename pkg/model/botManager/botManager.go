package botManager

import (
	"mcd/pkg/model/bot"
	"mcd/pkg/model/orderManager"
	"mcd/pkg/util"
	"sync"
)

type BotManager struct {
	bots []*bot.Bot
	om   *orderManager.OrderManager
	mu   sync.Mutex
}

func NewBotManager(om *orderManager.OrderManager) *BotManager {
	return &BotManager{
		bots: make([]*bot.Bot, 0),
		om:   om,
	}
}

func (bc *BotManager) Add() {
	bc.mu.Lock()
	defer bc.mu.Unlock()

	newBot := bot.NewBot(bc.om)
	bc.bots = append(bc.bots, newBot)

	util.Log("Add Bot #%d", newBot.ID)
	newBot.Start()
}

func (bc *BotManager) Del() {
	bc.mu.Lock()
	defer bc.mu.Unlock()

	if len(bc.bots) > 0 {
		lastIndex := len(bc.bots) - 1
		lastBot := bc.bots[lastIndex]
		lastBot.Destroy()
		bc.bots = bc.bots[:lastIndex]

		util.Log("Del Bot #%d", lastBot.ID)
	} else {
		util.Log("No Bot to Del")
	}
}

func (bc *BotManager) Len() int {
	return len(bc.bots)
}
