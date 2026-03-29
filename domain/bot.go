package domain

import (
	"errors"
	"time"
)

const ProcessingTime = 10 * time.Second

type Bot struct {
	ID                  uint64
	Status              BotStatus
	CurrentOrder        *Order
	CreatedAt           time.Time
	ProcessingStartTime time.Time
	StateMachine        *FSM
}

func NewBot(id uint64) *Bot {
	return &Bot{
		ID:           id,
		Status:       Idle,
		CreatedAt:    time.Now(),
		StateMachine: NewBotFSM(),
	}
}

func (b *Bot) StartProcessing(order *Order) error {
	if b.Status != Idle {
		return errors.New("bot is not idle")
	}
	if order == nil {
		return errors.New("order cannot be nil")
	}

	b.StateMachine.HandleEvent("assign", order)
	b.Status = Processing
	b.CurrentOrder = order
	b.ProcessingStartTime = time.Now()
	order.MarkProcessing()

	return nil
}

func (b *Bot) CompleteProcessing() *Order {
	if b.Status != Processing {
		return nil
	}

	order := b.CurrentOrder
	if order != nil {
		order.MarkComplete()
	}

	b.StateMachine.HandleEvent("complete")
	b.Status = Idle
	b.CurrentOrder = nil
	b.ProcessingStartTime = time.Time{}

	return order
}

func (b *Bot) IsProcessing() bool {
	return b.Status == Processing
}

func (b *Bot) IsIdle() bool {
	return b.Status == Idle
}

func (b *Bot) GetRemainingTime() time.Duration {
	if b.Status != Processing {
		return 0
	}

	elapsed := time.Since(b.ProcessingStartTime)
	remaining := ProcessingTime - elapsed

	if remaining < 0 {
		return 0
	}

	return remaining
}

func (b *Bot) StopProcessing() *Order {
	if b.Status != Processing {
		return nil
	}

	order := b.CurrentOrder

	b.StateMachine.HandleEvent("error")
	b.Status = Idle
	b.CurrentOrder = nil
	b.ProcessingStartTime = time.Time{}

	return order
}
