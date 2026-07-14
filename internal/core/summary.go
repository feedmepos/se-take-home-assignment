package core

// Summary is a point-in-time snapshot of the whole order controller state:
// bots, pending orders, and completion counters. It is used by the
// handler/CLI layer to render status output without reaching into internal
// controller state directly.
type Summary struct {
	ActiveBots      int
	PendingOrders   int
	CompletedOrders int
	VIPCompleted    int
	NormalCompleted int

	Pending []Order
	Bots    []BotSnapshot
}

// BotSnapshot is a point-in-time view of a single bot's state.
type BotSnapshot struct {
	ID     int
	Status BotStatus
	// ProcessingOrderID is the ID of the order currently being processed,
	// or 0 when the bot is idle.
	ProcessingOrderID int
}
