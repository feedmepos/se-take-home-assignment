package model

type OrderStatus int

const (
	Pending OrderStatus = iota
	Processing
	Complete
)

func (s OrderStatus) String() string {
	switch s {
	case Pending:
		return "PENDING"
	case Processing:
		return "PROCESSING"
	case Complete:
		return "COMPLETE"
	default:
		return "UNKNOWN"
	}
}

type Order struct {
	ID     int
	IsVIP  bool
	Status OrderStatus
}

func (o *Order) Kind() string {
	if o.IsVIP {
		return "VIP"
	}
	return "Normal"
}
