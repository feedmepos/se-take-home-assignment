package controller

import (
	"fmt"
	"sync"
)

// BotStatus 机器人状态：空闲或处理中
type BotStatus int

const (
	Idle BotStatus = iota
	Processing
)

// Bot 表示一个烹饪机器人
type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order
	stopChannel  chan bool
	processingWg *sync.WaitGroup
}

func (b *Bot) String() string {
	status := "IDLE"
	if b.Status == Processing {
		status = "PROCESSING"
	}
	if b.CurrentOrder != nil {
		return fmt.Sprintf("Bot #%d (%s) - Processing Order #%d", b.ID, status, b.CurrentOrder.ID)
	}
	return fmt.Sprintf("Bot #%d (%s)", b.ID, status)
}
