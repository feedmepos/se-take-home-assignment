package order

// OrderType represents the priority level of an order.
type OrderType int

const (
	// OrderNormal is a regular-priority order.
	OrderNormal OrderType = iota
	// OrderVIP is a high-priority order that is processed before normal orders.
	OrderVIP
)

// OrderStatus represents the current state of an order in its lifecycle.
type OrderStatus int

const (
	// OrderPending means the order is waiting in the queue to be processed.
	OrderPending OrderStatus = iota
	// OrderProcessing means the order is currently being handled by a bot.
	OrderProcessing
	// OrderCompleted means the order has been fully processed.
	OrderCompleted
)

// BotStatus represents the current state of a cooking bot.
type BotStatus int

const (
	// BotIdle means the bot is available to pick up a new order.
	BotIdle BotStatus = iota
	// BotBusy means the bot is currently processing an order.
	BotBusy
)
