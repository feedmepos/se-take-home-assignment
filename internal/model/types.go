package model

import "time"

// OrderType 表示订单类别：VIP 或 NORMAL。
type OrderType string

const (
    OrderTypeVIP    OrderType = "VIP"
    OrderTypeNormal OrderType = "NORMAL"
)

// OrderStatus 表示订单状态。
type OrderStatus string

const (
    OrderPending    OrderStatus = "PENDING"
    OrderProcessing OrderStatus = "PROCESSING"
    OrderComplete   OrderStatus = "COMPLETE"
)

// Order 代表订单的核心信息（占位，后续由调度器维护生命周期）。
type Order struct {
    ID              int64
    Type            OrderType
    Status          OrderStatus
    CreatedAt       time.Time
    ProcessingBotID *int
}

// OrderRef 是轻量引用，队列中存放该结构。
type OrderRef struct {
    ID   int64
    Type OrderType
}

// BotState 表示 Bot 当前状态。
type BotState string

const (
    BotIdle    BotState = "IDLE"
    BotBusy    BotState = "BUSY"
    BotStopped BotState = "STOPPED"
)

// BotEventType 定义 Bot 上报的事件类型。
type BotEventType string

const (
    EventBotStarted      BotEventType = "BOT_STARTED"
    EventBotStopped      BotEventType = "BOT_STOPPED"
    EventBotIdle         BotEventType = "BOT_IDLE"
    EventOrderAssigned   BotEventType = "ORDER_ASSIGNED"
    EventOrderCompleted  BotEventType = "ORDER_COMPLETED"
    EventOrderInterrupted BotEventType = "ORDER_INTERRUPTED"
)

// BotEvent 是 Bot 向调度器上报的事件载体。
type BotEvent struct {
    Type      BotEventType
    BotID     int
    Order     *OrderRef
    Timestamp time.Time
}

// StatusSnapshot 用于 status 命令展示的一致性快照。
type StatusSnapshot struct {
    TimeNow       time.Time
    Bots          []BotInfo
    PendingVIP    []OrderRef
    PendingNormal []OrderRef
    CompleteCount int
    RecentDone    []OrderRef
}

// BotInfo 是对外展示的 Bot 可观测信息。
type BotInfo struct {
    ID           int
    State        BotState
    CurrentOrder *OrderRef
    StartedAt    *time.Time
}
