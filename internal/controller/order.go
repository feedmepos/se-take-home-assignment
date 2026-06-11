package controller

// OrderType distinguishes normal customers from VIP members.
type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (t OrderType) String() string {
	if t == VIP {
		return "VIP"
	}
	return "Normal"
}

// Order is the unit of work flowing through the system.
// IDs are globally unique and strictly increasing.
type Order struct {
	ID   int
	Type OrderType
}
