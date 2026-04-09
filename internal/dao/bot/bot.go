package bot

import (
	"time"
)

type BotStatus string

const (
	Idle   BotStatus = "IDLE"
	Active BotStatus = "ACTIVE"
)

type Bot struct {
	Id          int64
	Status      BotStatus
	ProcessTime time.Duration
}
