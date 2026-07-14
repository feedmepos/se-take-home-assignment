// Package memory provides in-memory implementations of the repository ports
// consumed by the usecase layer: an order queue/store (OrderRepository) and
// a bot registry (BotRegistry).
package memory

import (
	"feedme-order-controller/internal/core"
	"feedme-order-controller/internal/repository/entity"
)

// toEntity converts a core.Order into its storage representation.
//
// Only ID and Kind are persisted. Status is intentionally NOT stored on
// entity.OrderEntity: entities living in the pending queue are Pending by
// definition, and Processing/Complete are transient states reconstructed by
// the caller (toCore always yields Status=Pending; repository methods that
// return orders in another status set Status explicitly after conversion).
func toEntity(o core.Order) entity.OrderEntity {
	return entity.OrderEntity{
		ID:   o.ID,
		Kind: int(o.Kind),
	}
}

// toCore converts a stored OrderEntity back into a core.Order. The returned
// order always has Status=Pending; callers that need a different status
// (Processing, Complete) must set it explicitly, since status is not part
// of the persisted entity.
func toCore(e entity.OrderEntity) core.Order {
	return core.Order{
		ID:     e.ID,
		Kind:   core.OrderKind(e.Kind),
		Status: core.StatusPending,
	}
}
