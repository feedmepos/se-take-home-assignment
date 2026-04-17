package model

type OrderPriority string

const (
	PriorityNormal OrderPriority = "NORMAL"
	PriorityVIP    OrderPriority = "VIP"
)

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusProcessing OrderStatus = "PROCESSING"
	OrderStatusComplete   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	BotStatusIdle BotStatus = "IDLE"
	BotStatusBusy BotStatus = "BUSY"
)
