package types

import "time"

// OrderType identifies the customer priority class for an order.
type OrderType string

const (
	// TypeVIP orders are processed before normal orders.
	TypeVIP OrderType = "VIP"
	// TypeNormal orders are processed after all pending VIP orders.
	TypeNormal OrderType = "Normal"
)

// OrderStatus identifies where an order is in the control flow.
type OrderStatus string

const (
	// StatusPending means the order is waiting for a bot.
	StatusPending OrderStatus = "PENDING"
	// StatusProcessing means a bot has picked up the order.
	StatusProcessing OrderStatus = "PROCESSING"
	// StatusComplete means the order has finished cooking.
	StatusComplete OrderStatus = "COMPLETE"
)

// ProcessingDuration is the simulated time a bot needs to complete one order.
const ProcessingDuration = 10 * time.Second

// Order is an in-memory restaurant order.
type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	StartedAt   time.Time
	CompletedAt time.Time
}

// Bot is an in-memory cooking bot. OrderID is zero when the bot is idle.
type Bot struct {
	ID      int
	OrderID int
}

// EventKind describes a domain event emitted by controller operations.
type EventKind string

const (
	EventOrderPending   EventKind = "order_pending"
	EventBotAdded       EventKind = "bot_added"
	EventBotStarted     EventKind = "bot_started"
	EventOrderCompleted EventKind = "order_completed"
	EventBotRemoved     EventKind = "bot_removed"
	EventOrderRequeued  EventKind = "order_requeued"
)

// Event describes a state transition without coupling the domain to stdout.
type Event struct {
	Kind      EventKind
	At        time.Time
	OrderID   int
	OrderType OrderType
	BotID     int
}

// Processing shows which bot is currently processing an order.
type Processing struct {
	BotID int
	Order Order
}

// Snapshot is a read-only copy of controller state for status rendering/tests.
type Snapshot struct {
	Now        time.Time
	Pending    []Order
	Processing []Processing
	Complete   []Order
	Bots       []Bot
}
