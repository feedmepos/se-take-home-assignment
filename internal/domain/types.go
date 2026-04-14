package domain

// OrderID 全局唯一递增订单号（README 要求 3）。
type OrderID uint64

// BotID 烹饪机器人标识。
type BotID uint64

// Tier 订单等级：VIP 全体优先于 Normal（README 用户故事 2）。
type Tier uint8

const (
	TierNormal Tier = iota
	TierVIP
)

// OrderStatus 订单生命周期（DESIGN 4.1 + exception / -Bot 回队）。
type OrderStatus uint8

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderComplete
	OrderException
)

// BotState 机器人状态（DESIGN 2.2）。
type BotState uint8

const (
	BotIdle BotState = iota
	BotWorking
	BotStopped
)

// ExceptionKind 异常分类（DESIGN 4.1）。
type ExceptionKind uint8

const (
	ExceptionUnknown ExceptionKind = iota
	ExceptionInternal
	ExceptionTimeout
	ExceptionNetwork
)
