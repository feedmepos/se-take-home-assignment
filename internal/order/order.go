package order

import "time"

type Type string

const (
	Normal Type = "NORMAL"
	VIP    Type = "VIP"
)

type Status string

const (
	StatusPending    Status = "PENDING"
	StatusProcessing Status = "PROCESSING"
	StatusComplete   Status = "COMPLETE"
)

type Order struct {
	ID        int
	Type      Type
	Status    Status
	CreatedAt time.Time
}

func New(id int, t Type, now time.Time) *Order {
	return &Order{
		ID:        id,
		Type:      t,
		Status:    StatusPending,
		CreatedAt: now,
	}
}
