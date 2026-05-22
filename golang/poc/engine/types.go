package engine

type Privilege string

const (
	Normal Privilege = "Normal"
	VIP    Privilege = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID        int
	Privilege Privilege
	Status    OrderStatus
	CreatedAt int64 // unix ms (optional)
}

type BotState string

const (
	Idle    BotState = "IDLE"
	Working BotState = "WORKING"
	Stopped BotState = "STOPPED"
)

type EventType string

const (
	EvtSystemInit     EventType = "SYSTEM_INIT"
	EvtOrderCreated   EventType = "ORDER_CREATED"
	EvtBotAdded       EventType = "BOT_ADDED"
	EvtBotRemoved     EventType = "BOT_REMOVED"
	EvtBotCancelled   EventType = "BOT_CANCELLED"
	EvtOrderPicked    EventType = "ORDER_PICKED"
	EvtOrderCompleted EventType = "ORDER_COMPLETED"
	EvtBotIdle        EventType = "BOT_IDLE"
	EvtFinalSummary   EventType = "FINAL_SUMMARY"
)

type Event struct {
	Type         EventType
	BotID        int
	OrderID      int
	Privilege    Privilege
	BotsCount    int
	ProcessingMS int64
	Message      string // optional extra text
}
