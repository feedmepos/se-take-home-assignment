package model

import "time"

type Bot struct {
	id              int
	status          BotStatus
	processDuration time.Duration
}

func NewBot(id int, status BotStatus, processDuration time.Duration) *Bot {
	return &Bot{
		id:              id,
		status:          status,
		processDuration: processDuration,
	}
}

func (b *Bot) ID() int {
	return b.id
}

func (b *Bot) Status() BotStatus {
	return b.status
}

func (b *Bot) ProcessDuration() time.Duration {
	return b.processDuration
}

func (b *Bot) SetStatus(status BotStatus) {
	b.status = status
}
