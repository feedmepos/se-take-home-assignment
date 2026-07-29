package order

type Type string

const (
	TypeNormal Type = "NORMAL"
	TypeVIP    Type = "VIP"
)

type Status string

const (
	StatusPending    Status = "PENDING"
	StatusProcessing Status = "PROCESSING"
	StatusComplete   Status = "COMPLETE"
)

type Order struct {
	ID     int
	Type   Type
	Status Status
}
