package usecase

import (
	"time"

	"feedme-order-controller/internal/core"
)

// runBot is the worker loop executed by each bot's dedicated goroutine. It
// repeatedly dequeues an order, "cooks" it for u.processingTime, and
// completes it — unless the bot is stopped while idle (returns immediately)
// or stopped while processing (requeues the in-flight order and returns).
// It always calls bot.MarkDone on exit so callers (RemoveBot/Shutdown) can
// deterministically wait for the goroutine to fully wind down via bot.Done().
func (u *Usecase) runBot(bot *core.Bot) {
	defer bot.MarkDone()

	for {
		order, ok := u.orders.Dequeue(bot.StopSignal())
		if !ok {
			// Stopped while idle; RemoveBot/Shutdown logs the IDLE message.
			return
		}

		bot.SetProcessing(order)
		u.logger.Logf("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, order.Kind, order.ID)

		timer := time.NewTimer(u.processingTime)
		select {
		case <-timer.C:
			completed := u.orders.Complete(order)
			bot.SetIdle()
			u.logger.Logf("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %s)", bot.ID, completed.Kind, completed.ID, u.processingTime)
			if u.orders.PendingLen() == 0 {
				u.logger.Logf("Bot #%d is now IDLE - No pending orders", bot.ID)
			}
		case <-bot.StopSignal():
			timer.Stop()
			// Deliberately no SetIdle here: the bot is exiting, and leaving
			// Current() non-nil is how RemoveBot (after <-bot.Done()) knows the
			// destruction happened mid-processing rather than while idle.
			u.orders.Requeue(order)
			u.logger.Logf("Bot #%d destroyed while PROCESSING %s Order #%d - order returned to PENDING", bot.ID, order.Kind, order.ID)
			return
		}
	}
}
