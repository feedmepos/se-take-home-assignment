package model

import "time"

type ProcessingRecord struct {
	bot       *Bot
	order     *Order
	startedAt time.Time
	finishAt  time.Time
	canceled  bool
}

func NewProcessingRecord(bot *Bot, order *Order, startedAt, finishAt time.Time) *ProcessingRecord {
	return &ProcessingRecord{
		bot:       bot,
		order:     order,
		startedAt: startedAt,
		finishAt:  finishAt,
	}
}

func (r *ProcessingRecord) Bot() *Bot {
	return r.bot
}

func (r *ProcessingRecord) Order() *Order {
	return r.order
}

func (r *ProcessingRecord) FinishAt() time.Time {
	return r.finishAt
}

func (r *ProcessingRecord) Cancel() {
	r.canceled = true
}

func (r *ProcessingRecord) IsCanceled() bool {
	return r.canceled
}
