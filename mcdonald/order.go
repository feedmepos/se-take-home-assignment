package mcdonald

type Customer string

const NormalCustomer Customer = "normal"
const VIPCustomer Customer = "vip"

type OrderStatus string

const (
	StatusPending    OrderStatus = "PENDING"
	StatusComplete   OrderStatus = "COMPLETE"
	StatusProcessing OrderStatus = "PROCESSING"
)

type Order struct {
	ID       int
	Customer Customer
	Status   OrderStatus
}
