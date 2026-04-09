package order

// OrderType represents the type of order
type OrderType string

const (
	Normal OrderType = "NORMAL"
	VIP    OrderType = "VIP"
)

// OrderStatus represents the current status of an order
type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

// Order represents a single order
type Order struct {
	Id     int64
	Type   OrderType
	Status OrderStatus
}
