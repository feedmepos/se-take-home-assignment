package model

import "time"

// OrderType 订单类型
type OrderType int

const (
	OrderTypeNormal OrderType = iota
	OrderTypeVIP
)

// OrderStatus 订单状态
type OrderStatus int

const (
	OrderStatusPending   OrderStatus = iota // 待处理
	OrderStatusProcessing                   // 处理中
	OrderStatusComplete                     // 已完成
)

// Order 订单实体
type Order struct {
	ID        int         // 唯一递增 ID
	Type      OrderType   // 订单类型
	Status    OrderStatus // 订单状态
	CreatedAt time.Time   // 创建时间
	StartTime *time.Time  // 开始处理时间（nil 表示未开始）
	EndTime   *time.Time  // 完成时间（nil 表示未完成）
}

// IsVIP returns true if the order is a VIP order
func (o *Order) IsVIP() bool {
	return o.Type == OrderTypeVIP
}

// TypeString returns human-readable order type
func (o *Order) TypeString() string {
	if o.IsVIP() {
		return "VIP"
	}
	return "Normal"
}

// StatusString returns human-readable status
func (o *Order) StatusString() string {
	switch o.Status {
	case OrderStatusPending:
		return "PENDING"
	case OrderStatusProcessing:
		return "PROCESSING"
	case OrderStatusComplete:
		return "COMPLETE"
	default:
		return "UNKNOWN"
	}
}
