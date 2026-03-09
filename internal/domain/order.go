package domain

import "time"

type OrderType string
type OrderStatus string

const (
	OrderTypeNormal OrderType = "normal"
	OrderTypeVIP    OrderType = "vip"

	OrderStatusPending  OrderStatus = "pending"
	OrderStatusComplete OrderStatus = "complete"
)

type Order struct {
	ID           int         `json:"id"`
	CustomerName string      `json:"customer_name" binding:"required"`
	OrderType    OrderType   `json:"order_type" binding:"required,oneof=normal vip"`
	Status       OrderStatus `json:"status"`
	CreatedAt    time.Time   `json:"created_at"`
	CompletedAt  *time.Time  `json:"completed_at,omitempty"`
}
