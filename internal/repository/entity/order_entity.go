// Package entity holds storage-layer models for the in-memory repository.
// Entities are intentionally decoupled from the usecase/core domain types so
// the repository layer does not depend upward on business logic packages.
package entity

// OrderEntity is the persisted (in-memory) representation of an order.
//
// Kind mirrors core.OrderKind but is stored as a plain int (0=Normal,
// 1=VIP) to keep this package free of any dependency on usecase/core.
type OrderEntity struct {
	ID   int
	Kind int
}
