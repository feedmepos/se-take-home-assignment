package main

import (
	"time"
)

// OrderStatus represents the status of an order
type OrderStatus string

const (
	StatusPending    OrderStatus = "PENDING"
	StatusProcessing OrderStatus = "PROCESSING"
	StatusComplete   OrderStatus = "COMPLETE"
)

// OrderType represents the type of an order (Normal or VIP)
type OrderType string

const (
	TypeNormal OrderType = "NORMAL"
	TypeVIP    OrderType = "VIP"
)

// Order represents a customer order
type Order struct {
	ID        int         `json:"id"`
	Type      OrderType   `json:"type"`
	Status    OrderStatus `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
}

// BotStatus represents the status of a bot
type BotStatus string

const (
	BotIdle       BotStatus = "IDLE"
	BotProcessing BotStatus = "PROCESSING"
)

// Bot represents a cooking bot
type Bot struct {
	ID             int       `json:"id"`
	Status         BotStatus `json:"status"`
	CurrentOrderID int       `json:"current_order_id,omitempty"`
}
