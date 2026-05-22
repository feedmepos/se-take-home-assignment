package domain

type OrderType int

const (
	Normal OrderType = 0
	VIP    OrderType = 1
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
