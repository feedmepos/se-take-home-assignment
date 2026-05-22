package domain

type OrderStatus int

const (
	OrderPending    OrderStatus = 0
	OrderProcessing OrderStatus = 1
	OrderComplete   OrderStatus = 2
)

func (os OrderStatus) String() string {
	switch os {
	case OrderPending:
		return "Pending"
	case OrderProcessing:
		return "Processing"
	case OrderComplete:
		return "Complete"
	default:
		return "Unknown"
	}
}

func (os OrderStatus) IsPending() bool {
	return os == OrderPending
}

func (os OrderStatus) IsProcessing() bool {
	return os == OrderProcessing
}

func (os OrderStatus) IsComplete() bool {
	return os == OrderComplete
}
