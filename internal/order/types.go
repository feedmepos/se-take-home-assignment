package order

import "time"

// OrderType 区分 VIP 和普通订单。VIP 在 pending 队列里整体排在 Normal 前面。
type OrderType string

const (
	NormalOrder OrderType = "Normal"
	VIPOrder    OrderType = "VIP"
)

// OrderStatus 表示订单在生命周期中的阶段。
type OrderStatus string

const (
	PendingStatus    OrderStatus = "PENDING"
	ProcessingStatus OrderStatus = "PROCESSING"
	CompleteStatus   OrderStatus = "COMPLETE"
)

// Order 是单个订单的完整状态。Controller 内部以 *Order 流转，对外暴露时拷贝成值。
type Order struct {
	ID        int         `json:"id"`
	Type      OrderType   `json:"type"`
	Status    OrderStatus `json:"status"`
	CreatedAt time.Time   `json:"createdAt"`
	StartedAt time.Time   `json:"startedAt,omitempty"`
	DoneAt    time.Time   `json:"doneAt,omitempty"`
}

// BotStatus 是对外暴露的 bot 状态：处理中为 ACTIVE，空闲为 IDLE。
type BotStatus string

const (
	ActiveBot BotStatus = "ACTIVE"
	IdleBot   BotStatus = "IDLE"
)

// BotSnapshot 是 bot 的不可变快照。
type BotSnapshot struct {
	ID            int       `json:"id"`
	Status        BotStatus `json:"status"`
	ProcessingID  int       `json:"processingId,omitempty"`
	ProcessingVIP bool      `json:"processingVip,omitempty"`
}

// Snapshot 是整个 controller 的不可变快照，由 Snapshot() 在 mu 下生成。
// 所有 slice 都是值拷贝，调用方可任意修改。
type Snapshot struct {
	Pending       []Order       `json:"pending"`
	Processing    []Order       `json:"processing"`
	Bots          []BotSnapshot `json:"bots"`
	TotalOrders   int           `json:"totalOrders"`
	VIPCompleted  int           `json:"vipCompleted"`
	NormCompleted int           `json:"normalCompleted"`
}
