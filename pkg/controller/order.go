package controller

import (
	"time"
)

type OrderType int

const (
	normal OrderType = iota
	vip
)

func (ot OrderType) String() string {
	switch ot {
	case normal:
		return "Normal"
	case vip:
		return "VIP"
	default:
		return "Unknown"
	}
}

type OrderStatus int

const (
	pending OrderStatus = iota
	completed
)

func (os OrderStatus) String() string {
	switch os {
	case pending:
		return "PENDING"
	case completed:
		return "COMPLETED"
	default:
		return "UNKNOWN"
	}
}

type Order struct {
	id        int
	orderType OrderType
	status    OrderStatus
	createdAt time.Time
}
