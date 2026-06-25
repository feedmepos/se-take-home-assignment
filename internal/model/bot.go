package model

import "time"

// BotStatus 机器人状态
type BotStatus int

const (
	BotStatusIdle       BotStatus = iota // 空闲
	BotStatusProcessing                  // 处理订单中
	BotStatusStopping                    // 正在被停止
)

// Bot 烹饪机器人
type Bot struct {
	ID       int         // 机器人唯一 ID
	Status   BotStatus   // 当前状态
	Current  *Order      // 当前处理的订单（nil 表示空闲）
	Timer    *time.Timer // 10 秒定时器
	StopChan chan struct{} // 停止信号通道
}

// StatusString returns human-readable status
func (b *Bot) StatusString() string {
	switch b.Status {
	case BotStatusIdle:
		return "IDLE"
	case BotStatusProcessing:
		return "PROCESSING"
	case BotStatusStopping:
		return "STOPPING"
	default:
		return "UNKNOWN"
	}
}
