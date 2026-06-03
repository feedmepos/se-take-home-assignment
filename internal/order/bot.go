package order

import "time"

type Timer interface {
	Stop() bool
}

type AfterFunc func(time.Duration, func()) Timer

type BotState string

const (
	Idle BotState = "IDLE"
	Busy BotState = "PROCESSING"
)

type Bot struct {
	ID    int
	State BotState
	Timer Timer
}

func (c *Controller) AddBot() {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := Bot{
		ID:    c.nextBotID(),
		State: Idle,
	}

	c.bots = append(c.bots, bot)
	c.logEvent("Bot #%d created - Status: %s", bot.ID, "ACTIVE")
	c.processPendingOrders()
}

func (c *Controller) RemoveBot() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		c.logEvent("No bots available to remove")
		return
	}

	index := len(c.bots) - 1
	bot := c.bots[index]
	c.bots = c.bots[:index]

	if bot.Timer != nil {
		bot.Timer.Stop()
	}

	if bot.State == Busy {
		order, processingIndex := c.findProcessingOrderByBotID(bot.ID)
		if order != nil {
			c.processing = append(c.processing[:processingIndex], c.processing[processingIndex+1:]...)
			order.Status = Pending
			order.BotID = 0
			order.StartedAt = time.Time{}
			c.enqueuePendingOrder(order)
			c.logEvent("Bot #%d destroyed while PROCESSING %s Order #%d - Order returned to PENDING", bot.ID, order.Kind, order.ID)
			c.processPendingOrders()
			return
		}
	}

	c.logEvent("Bot #%d destroyed while %s", bot.ID, bot.State)
}
