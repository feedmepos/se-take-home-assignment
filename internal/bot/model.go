package bot

import (
	"context"
	"main/internal/order"
	"sync"
	"time"
)

type BotStatus string

const (
	Idle       BotStatus = "IDLE"
	Processing BotStatus = "PROCESSING"
)

type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *order.Order
	StartTime    time.Time
	cancel       context.CancelFunc
	mu           sync.RWMutex
}
