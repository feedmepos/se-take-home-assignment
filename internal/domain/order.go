package domain

import "time"

// Order 领域订单（内存原型）。
type Order struct {
	ID     OrderID
	Tier   Tier
	Status OrderStatus
	BotID  *BotID // processing 时非空；其余状态为 nil

	// 从 pending 出队成为 processing 前，记录在子队列中的位置（-Bot 回插用，DESIGN 6.2）。
	PendingTier  Tier
	PendingIndex int

	ErrorCode    string
	ErrorMessage string
	Exception    ExceptionKind

	CreatedAt   time.Time // 建单时间
	StartedAt   time.Time // 开始处理（processing）
	CompletedAt time.Time // 完成（complete）
}
