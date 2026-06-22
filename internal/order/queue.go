package order

import (
	"time"

	"se-take-home-assignment/internal/types"
)

func insertPending(queue []types.Order, next types.Order) []types.Order {
	next.Status = types.StatusPending
	next.StartedAt = time.Time{}
	next.CompletedAt = time.Time{}

	queue = append(queue, next)
	for i := len(queue) - 1; i > 0 && before(queue[i], queue[i-1]); i-- {
		queue[i], queue[i-1] = queue[i-1], queue[i]
	}
	return queue
}

func before(a, b types.Order) bool {
	if a.Type != b.Type {
		return a.Type == types.TypeVIP
	}
	return a.ID < b.ID
}
