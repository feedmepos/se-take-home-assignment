package dto

// StatusResponse is the full view rendered for a "status" query: the
// current pending queue and bot states, plus a running completed count.
type StatusResponse struct {
	Pending        []OrderView
	Bots           []BotView
	CompletedCount int
}

// SummaryResponse is a compact counters-only view of controller state.
type SummaryResponse struct {
	ActiveBots      int
	PendingOrders   int
	CompletedOrders int
	VIPCompleted    int
	NormalCompleted int
}
