package usecase

import "feedme-order-controller/internal/usecase/core"

// AddBot registers a new bot and starts its worker goroutine, which
// immediately begins pulling orders off the pending queue.
func (u *Usecase) AddBot() *core.Bot {
	bot := core.NewBot(u.bots.NextBotID())
	u.bots.Add(bot)

	u.wg.Add(1)
	go func() {
		defer u.wg.Done()
		u.runBot(bot)
	}()

	u.logger.Logf("Bot #%d created - Status: ACTIVE", bot.ID)
	return bot
}

// RemoveBot removes the most recently added bot and stops it, waiting for
// its worker goroutine to fully exit before returning. If the bot was idle
// when removed, this logs the IDLE-destruction message directly; if it was
// mid-processing, runBot itself logs the PROCESSING-destruction message and
// requeues the in-flight order.
func (u *Usecase) RemoveBot() (*core.Bot, error) {
	bot, ok := u.bots.RemoveNewest()
	if !ok {
		return nil, ErrNoBots
	}

	bot.Stop()
	u.orders.WakeAll()
	<-bot.Done

	// Decide which destruction message applies only AFTER the worker has
	// fully exited: runBot's stop-mid-processing branch leaves Current()
	// non-nil (and logs the PROCESSING message itself), while every idle
	// exit path leaves Current() nil. Checking before Stop() would race
	// with the worker picking up or completing an order.
	if bot.Current() == nil {
		u.logger.Logf("Bot #%d destroyed while IDLE", bot.ID)
	}

	return bot, nil
}

// Shutdown stops all registered bots, waits for their worker goroutines to
// fully exit, and returns the final status summary.
func (u *Usecase) Shutdown() core.Summary {
	for _, bot := range u.bots.List() {
		bot.Stop()
	}
	u.orders.WakeAll()
	u.wg.Wait()

	// Drain the registry: every bot has now exited, so the final summary
	// should report zero active bots.
	for {
		if _, ok := u.bots.RemoveNewest(); !ok {
			break
		}
	}

	u.logger.Logf("System shutdown - all bots stopped")
	return u.Status()
}
