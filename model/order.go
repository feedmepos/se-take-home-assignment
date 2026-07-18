package model

// OrderType 订单类型：普通订单或 VIP 订单
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (t OrderType) String() string {
	switch t {
	case Normal:
		return "Normal"
	case VIP:
		return "VIP"
	default:
		return "Unknown"
	}
}

// OrderStatus 订单状态：等待中、处理中、已完成
type OrderStatus int

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderComplete
)

// Order 表示一个订单
type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}
