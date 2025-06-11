package consts

type OrderStatus int

const (
	OrderStatusPending    OrderStatus = 0
	OrderStatusProcessing OrderStatus = 1
	OrderStatusFinished   OrderStatus = 2
)

type OrderPriority int

const (
	OrderPriorityNormal OrderPriority = 0
	OrderPriorityVip    OrderPriority = 1
)

type BotStatus int

const (
	BotStatusIdle    BotStatus = 0 // 空闲
	BotStatusCooking BotStatus = 1 // 制餐中
)
