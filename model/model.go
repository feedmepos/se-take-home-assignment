package model

// OrderType 订单类型
type OrderType string

const (
	Normal OrderType = "普通"
	VIP    OrderType = "VIP"
)

// OrderStatus 订单状态
type OrderStatus string

const (
	Pending    OrderStatus = "等待中"
	Processing OrderStatus = "处理中"
	Complete   OrderStatus = "已完成"
)

// Order 客户订单
type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}

// Bot 烹饪机器人
type Bot struct {
	ID int
}
