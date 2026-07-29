package bot

import "github.com/Splinglove/se-take-home-assignment/internal/order"

type Status string

const (
	StatusIdle       Status = "IDLE"
	StatusProcessing Status = "PROCESSING"
)

type Bot struct {
	ID           int
	Status       Status
	CurrentOrder *order.Order
}
