package order

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

type OrderStatus int

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderCompleted
)

type BotStatus int

const (
	BotIdle BotStatus = iota
	BotBusy
)
