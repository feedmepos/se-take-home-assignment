package controller

import "time"

// 订单类型
type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

func (t OrderType) String() string {
	switch t {
	case OrderVIP:
		return "VIP"
	default:
		return "Normal"
	}
}

// 订单状态
type OrderStatus int

const (
	StatusPending OrderStatus = iota
	StatusProcessing
	StatusComplete
)

func (s OrderStatus) String() string {
	switch s {
	case StatusProcessing:
		return "PROCESSING"
	case StatusComplete:
		return "COMPLETE"
	default:
		return "PENDING"
	}
}

// 订单
type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	BotID       int        // 正在处理的 Bot ID，0 表示未分配
	CreatedAt   time.Time
	ProcessingAt *time.Time // 开始处理时间
	CompletedAt *time.Time // 完成时间
}

// Bot 状态
type BotStatus int

const (
	BotIdle BotStatus = iota
	BotProcessing
)

func (s BotStatus) String() string {
	switch s {
	case BotProcessing:
		return "ACTIVE"
	default:
		return "IDLE"
	}
}

// Bot 信息（只读快照）
type BotInfo struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order // 当前处理的订单，nil 表示空闲
}
