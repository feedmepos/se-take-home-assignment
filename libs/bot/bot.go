// Package bot proides functionality for managing cooking bot.
package bot

import (
	"fmt"
	"time"

	ord "github.com/jason0w0/se-take-home-assignment/libs/order"
	"github.com/jason0w0/se-take-home-assignment/libs/utils"
)

type Manager interface {
	GetNextOrder() *ord.Order
	SetOrderCompleted(orderID int)
	SetOrderPending(orderID int)
}

type Status string

const (
	IDLE = "idle"
	BUSY = "busy"
)

var id = 0

type Bot struct {
	manager      Manager
	StopChannel  chan bool
	ReadyChannel chan bool
	OrderChannel chan struct{}
	Status       Status
	ID           int
}

func NewBot(manager Manager) *Bot {
	bot := &Bot{
		manager:      manager,
		StopChannel:  make(chan bool, 1),
		ReadyChannel: make(chan bool, 1),
		OrderChannel: make(chan struct{}, 1),
		Status:       IDLE,
		ID:           id,
	}

	id++

	return bot
}

func (bot *Bot) Run() {
	close(bot.ReadyChannel)
	for {
		select {
		case <-bot.StopChannel:
			return
		default:
			order := bot.manager.GetNextOrder()
			if order == nil {
				bot.Status = IDLE
				select {
				case <-bot.StopChannel:
					return
				case <-bot.OrderChannel:
					continue
				}
			}

			utils.WriteToLog(fmt.Sprintf("bot %d received order %d", bot.ID, order.ID))
			bot.processOrder(order.ID)
		}
	}
}

func (bot *Bot) processOrder(orderID int) {
	bot.Status = BUSY
	select {
	case <-bot.StopChannel:
		bot.manager.SetOrderPending(orderID)
	case <-time.After(10 * time.Second):
		bot.manager.SetOrderCompleted(orderID)
	}
}
