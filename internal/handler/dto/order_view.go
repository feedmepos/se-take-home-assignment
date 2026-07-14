// Package dto holds the view models returned by the handler/CLI layer.
// These are presentation-shaped (string statuses/types) and independent of
// both the domain (usecase/core) and storage (repository/entity) layers.
package dto

// OrderView is the presentation model for an order.
type OrderView struct {
	ID     int
	Type   string
	Status string
}
