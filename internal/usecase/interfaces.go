// Package usecase implements the application/business logic layer for the
// order controller: creating orders, managing bots, and driving the
// bot worker loop that consumes orders from the queue. It depends only on
// the usecase/core domain models and on small ports (declared in this file)
// that repository/infrastructure packages implement structurally.
package usecase

import (
	"time"

	"feedme-order-controller/internal/core"
)

// Clock abstracts wall-clock access so tests can supply a fake. Any type
// with a Now() time.Time method satisfies this interface structurally.
type Clock interface {
	Now() time.Time
}

// Logger abstracts line-oriented logging so tests can supply a no-op or
// recording fake. Any type with a Logf(format string, args ...any) method
// satisfies this interface structurally.
type Logger interface {
	Logf(format string, args ...any)
}

// OrderRepository is the port the usecase layer uses to persist and
// retrieve orders. Implementations own priority ordering (VIP ahead of
// Normal, FIFO within a kind) and must make Dequeue block until an order is
// available or the given stop channel is closed.
type OrderRepository interface {
	// NextOrderID returns the next strictly increasing order ID.
	NextOrderID() int
	// Enqueue adds an order to the pending queue, preserving priority
	// ordering (VIP ahead of Normal, FIFO within a kind).
	Enqueue(o core.Order)
	// Dequeue blocks until an order becomes available or stop is closed.
	// It returns (order, true) when an order was dequeued, or (zero, false)
	// if stop closed before one became available.
	Dequeue(stop <-chan struct{}) (core.Order, bool)
	// Requeue re-inserts an order, preserving its original priority
	// position (used when a bot is destroyed mid-processing).
	Requeue(o core.Order)
	// Complete marks an order as completed and returns the completed
	// order (with Status=core.StatusComplete).
	Complete(o core.Order) core.Order
	// WakeAll wakes any goroutines blocked in Dequeue so they can re-check
	// their stop channel.
	WakeAll()
	// PendingSnapshot returns a point-in-time copy of the pending queue.
	PendingSnapshot() []core.Order
	// CompletedCounts returns the number of completed orders, in total and
	// broken down by kind. Counts (rather than a snapshot of the orders
	// themselves) are all any consumer needs, and they let implementations
	// avoid retaining every completed order forever.
	CompletedCounts() (total, vip, normal int)
	// PendingLen returns the number of orders currently pending.
	PendingLen() int
}

// BotRepository is the port the usecase layer uses to manage the set of
// live bots.
type BotRepository interface {
	// NextBotID returns the next strictly increasing bot ID.
	NextBotID() int
	// Add registers a new bot.
	Add(b *core.Bot)
	// RemoveNewest removes and returns the most recently added bot, or
	// (nil, false) if there are none.
	RemoveNewest() (*core.Bot, bool)
	// List returns a point-in-time copy of the registered bots.
	List() []*core.Bot
	// Count returns the number of registered bots.
	Count() int
}
