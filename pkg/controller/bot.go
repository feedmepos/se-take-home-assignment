package controller

import (
	"context"
	"sync"
	"time"
)

type Bot struct {
	ID           int
	Ctx          context.Context
	Cancel       context.CancelFunc
	Jobs         chan *Order
	CookDuration time.Duration

	mu          sync.Mutex
	activeOrder *Order
}

func NewBot(id int, ctx context.Context, cancel context.CancelFunc, cookDuration time.Duration) *Bot {
	return &Bot{
		ID:           id,
		Ctx:          ctx,
		Cancel:       cancel,
		Jobs:         make(chan *Order),
		CookDuration: cookDuration,
	}
}

func (b *Bot) Run(d *Dispatcher) {
	// Signal dispatcher that this bot is now running
	d.RegisterBot(b)

	for {
		// 1. Mark bot as idle and register with the dispatcher to receive a job
		b.setActiveOrder(nil)
		select {
		case <-b.Ctx.Done():
			d.UnregisterBot(b.ID)
			return
		case d.botIdleChan <- b:
		}

		// 2. Wait for a job to arrive or cancellation
		select {
		case <-b.Ctx.Done():
			d.UnregisterBot(b.ID)
			return
		case order, ok := <-b.Jobs:
			if !ok || order == nil {
				d.UnregisterBot(b.ID)
				return
			}
			b.process(order, d)
		}
	}
}

func (b *Bot) process(order *Order, d *Dispatcher) {
	b.setActiveOrder(order)
	d.OnOrderStart(b.ID, order)

	timer := time.NewTimer(b.CookDuration)
	defer timer.Stop()

	select {
	case <-timer.C:
		order.Status = StatusComplete
		d.OnOrderComplete(b.ID, order)
	case <-b.Ctx.Done():
		// Interrupted! Revert status and notify dispatcher
		order.Status = StatusPending
		d.OnOrderInterrupt(b.ID, order)
	}
}

func (b *Bot) GetActiveOrder() *Order {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.activeOrder
}

func (b *Bot) setActiveOrder(order *Order) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.activeOrder = order
}
