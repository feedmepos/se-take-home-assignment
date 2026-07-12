package controller

import (
	"fmt"
	"time"
)

// OrderType 订单类型：普通或 VIP
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

// 订单状态常量
const (
	StatusPending   = "PENDING"
	StatusProcessing = "PROCESSING"
	StatusComplete  = "COMPLETE"
)

// Order 表示一个麦当劳订单
type Order struct {
	ID       int
	Type     OrderType
	Status   string
	CreateAt time.Time
}

func (o *Order) String() string {
	orderType := "NORMAL"
	if o.Type == VIP {
		orderType = "VIP"
	}
	return fmt.Sprintf("Order #%d (%s) - %s", o.ID, orderType, o.Status)
}
