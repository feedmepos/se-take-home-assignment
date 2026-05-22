package internal

type OrderType string
type OrderStatus string

const (
	Normal OrderType = "NORMAL"
	VIP    OrderType = "VIP"

	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID     int
	Type   OrderType
	status OrderStatus
}

// Status returns the current order status.
func (o *Order) Status() OrderStatus { return o.status }
