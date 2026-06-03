package order

import "time"

func (c *Controller) processPendingOrders() {
	for {
		bot := c.findIdleBot()
		if bot == nil {
			return
		}

		order := c.nextPendingOrder()
		if order == nil {
			return
		}

		c.startProcessing(bot, order)
	}
}

func (c *Controller) findIdleBot() *Bot {
	for i := range c.bots {
		if c.bots[i].State == Idle {
			return &c.bots[i]
		}
	}
	return nil
}

func (c *Controller) nextPendingOrder() *Order {
	if len(c.pendingVIP) > 0 {
		order := c.pendingVIP[0]
		c.pendingVIP = c.pendingVIP[1:]
		return order
	}

	if len(c.pendingNormal) > 0 {
		order := c.pendingNormal[0]
		c.pendingNormal = c.pendingNormal[1:]
		return order
	}

	return nil
}

func (c *Controller) startProcessing(bot *Bot, order *Order) {
	bot.State = Busy

	order.Status = Processing
	order.BotID = bot.ID
	order.StartedAt = c.now()

	c.processing = append(c.processing, order)
	c.logEvent("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, order.Kind, order.ID, order.Status)

	botID := bot.ID
	bot.Timer = c.afterFunc(ProcessingDuration, func() {
		c.completeOrder(botID)
	})
}

func (c *Controller) completeOrder(botID int) {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := c.findBotByID(botID)
	if bot == nil {
		return
	}

	order, index := c.findProcessingOrderByBotID(botID)
	if order == nil {
		return
	}

	c.processing = append(c.processing[:index], c.processing[index+1:]...)
	order.Status = Complete
	order.BotID = 0
	order.CompletedAt = c.now()
	c.completed = append(c.completed, order)

	bot.State = Idle
	bot.Timer = nil

	processingTime := order.CompletedAt.Sub(order.StartedAt).Round(time.Second)
	c.logEvent("Bot #%d completed %s Order #%d - Status: %s (Processing time: %s)", bot.ID, order.Kind, order.ID, order.Status, processingTime)
	c.processPendingOrders()
	if bot.State == Idle {
		c.logEvent("Bot #%d is now IDLE - No pending orders", bot.ID)
	}
}

func (c *Controller) findBotByID(botID int) *Bot {
	for i := range c.bots {
		if c.bots[i].ID == botID {
			return &c.bots[i]
		}
	}
	return nil
}

func (c *Controller) findProcessingOrderByBotID(botID int) (*Order, int) {
	for i, order := range c.processing {
		if order.BotID == botID {
			return order, i
		}
	}
	return nil, -1
}
