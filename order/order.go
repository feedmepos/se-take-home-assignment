package order

import "time"

type OrderType int

const (
	Normal OrderType = iota
	VIP
)

type Order struct {
	ID        int
	Type      OrderType
	CreatedAt time.Time
}