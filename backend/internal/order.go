package internal

import "time"

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

func (t OrderType) String() string {
	if t == OrderVIP {
		return "VIP"
	}
	return "Normal"
}

type Order struct {
	ID        int
	Type      OrderType
	CreatedAt time.Time
}
