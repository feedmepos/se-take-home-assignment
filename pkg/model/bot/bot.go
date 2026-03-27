package bot

import (
	"context"
	"mcd/pkg/model/order"
	"mcd/pkg/model/orderManager"
	"mcd/pkg/util"
	"sync/atomic"
	"time"
)

const (
	StatusProcessing = "PROCESSING"
	StatusIdle       = "IDLE"
)

var currBotID int64

type Bot struct {
	ID     int
	status int32 // 0=IDLE, 1=PROCESSING
	om     *orderManager.OrderManager
	ctx    context.Context
	cancel context.CancelFunc
}

func NewBot(om *orderManager.OrderManager) *Bot {
	id := int(atomic.AddInt64(&currBotID, 1))
	ctx, cancel := context.WithCancel(context.Background())

	b := &Bot{
		ID:     id,
		status: 0, // IDLE
		om:     om,
		ctx:    ctx,
		cancel: cancel,
	}

	return b
}

func (b *Bot) Start() {
	go b.run()
}

func (b *Bot) run() {
	for {
		if b.om.GetPendingCount() == 0 {
			atomic.StoreInt32(&b.status, 0)
			util.Log("Bot #%d is now IDLE - No pending orders", b.ID)
		}

		ord, err := b.om.TakeOrder(b.ctx)
		if err != nil {
			util.Log("Bot #%d is destroyed", b.ID)
			return
		}

		if ord != nil {
			b.process(ord)
		}
	}
}

func (b *Bot) process(ord *order.Order) {
	atomic.StoreInt32(&b.status, 1)
	util.Log("Bot #%d picked up %s Order #%d - Status: %s", b.ID, ord.Type, ord.ID, ord.Status)

	// wait 10 seconds or context canceled
	select {
	case <-time.After(10 * time.Second):
		// normal complete
		b.om.CompleteOrder(ord.ID)
		util.Log("Bot #%d completed %s Order #%d - Status: %s", b.ID, ord.Type, ord.ID, ord.Status)
	case <-b.ctx.Done():
		// context canceled
		b.om.ResetOrder(ord.ID)
		util.Log("Bot #%d processing interrupted for %s Order #%d - Status: %s", b.ID, ord.Type, ord.ID, ord.Status)
	}
}

func (b *Bot) Destroy() {
	b.cancel()
}

func (b *Bot) GetStatus() string {
	status := atomic.LoadInt32(&b.status)
	if status == 1 {
		return StatusProcessing
	}
	return StatusIdle
}
