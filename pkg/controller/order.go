package controller

import (
	"time"
)

type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (ot OrderType) String() string {
	switch ot {
	case Normal:
		return "Normal"
	case VIP:
		return "VIP"
	default:
		return "Unknown"
	}
}

type OrderStatus int

const (
	Pending OrderStatus = iota
	Completed
)

func (os OrderStatus) String() string {
	switch os {
	case Pending:
		return "Pending"
	case Completed:
		return "Completed"
	default:
		return "Unknown"
	}
}

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
}
