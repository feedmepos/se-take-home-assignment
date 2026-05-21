package sim

import "github.com/rs/zerolog/log"

func (c *Controller) AddBot() Bot {
	// create bot with next ID
	bot := Bot{
		ID: c.nextBotID,
	}
	c.nextBotID++

	if len(c.pending) > 0 {
		order := c.pending[0]
		c.pending = c.pending[1:] // [1:] the slice drop the first element
		order.Status = "PROCESSING"
		bot.Current = &order
		bot.BusyEnd = c.now.Add(c.processTime)
	}

	c.bots = append(c.bots, bot)
	log.Info().Msgf("Bot #%d created - Status: ACTIVE", bot.ID)
	if bot.Current != nil {
		log.Info().Msgf("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, bot.Current.OrderType(), bot.Current.ID, bot.Current.Status)
	}

	return bot
}

func (c *Controller) RemoveBot() {
	if len(c.bots) == 0 {
		return
	}

	// c.bots = [Bot0, Bot1, Bot2]
	// remove the newest bot on last position
	newestBot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	// if the bot is processing an order, put it back to pending
	if newestBot.Current != nil {
		// prepend back to front of pending (VIP priority still applies)
		log.Info().Msgf("Bot #%d destroyed while PROCESSING", newestBot.ID)
		c.pending = append([]Order{*newestBot.Current}, c.pending...)
	} else {
		log.Info().Msgf("Bot #%d destroyed while IDLE", newestBot.ID)
	}
}

// simulation clock by one time step
func (c *Controller) Tick() {
	// 1. complete finish orders - check every bot
	justFinished := map[int]bool{}
	for i := range c.bots {
		bot := &c.bots[i]
		if bot.Current != nil && !c.now.Before(bot.BusyEnd) { // if current bot is busy and the time has reached or passed the BusyEnd
			bot.Current.Status = "COMPLETE"
			log.Info().Msgf("Bot #%d completed %s Order #%d - Status: %s (Processing time: 10s)", bot.ID, bot.Current.OrderType(), bot.Current.ID, bot.Current.Status)
			c.complete = append(c.complete, *bot.Current)
			bot.Current = nil
			justFinished[bot.ID] = true
		}
	}

	// 2. assign pending orders to idle bots
	for idleBot := range c.bots {
		bot := &c.bots[idleBot]
		if bot.Current == nil && len(c.pending) > 0 { // if bot has no order and order pending more than 0
			order := c.pending[0]     // get first pending order
			c.pending = c.pending[1:] // and remove the first slice of array
			order.Status = "PROCESSING"
			bot.Current = &order
			bot.BusyEnd = c.now.Add(c.processTime)
			log.Info().Msgf("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, bot.Current.OrderType(), order.ID, order.Status)
			delete(justFinished, bot.ID) // bot got work, not idle
		}
	}
	// 3. only log IDLE for bots that just finished but got no new order
	for id := range justFinished {
		log.Info().Msgf("Bot #%d is now IDLE - No pending orders", id)
	}

	// 4. advance simulation time
	c.now = c.now.Add(c.timeStep)
}
