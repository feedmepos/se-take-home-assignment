package controller

import (
	"context"
	"time"
)

type BotStatus int

const (
	BotIdle BotStatus = iota
	BotProcessing
)

func (s BotStatus) String() string {
	if s == BotProcessing {
		return "PROCESSING"
	}
	return "IDLE"
}

type Bot struct {
	ID     int
	Status BotStatus

	current *Order
	cancel  context.CancelFunc
	stop    bool
	done    chan struct{}
}

func newBot(id int) *Bot {
	return &Bot{
		ID:     id,
		Status: BotIdle,
		done:   make(chan struct{}),
	}
}

func sleepCtx(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}
