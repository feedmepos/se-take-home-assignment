package order

import "time"

type CommandType int

const (
	CreateNormalOrder CommandType = iota
	CreateVIPOrder
	AddBotCommand
	RemoveBotCommand
	StatusCommand
	BotDoneCommand // Internal notification when bot finishes cooking
	GetStateCommand  // For testing and safe state querying
)

type Command struct {
	Type    CommandType
	Payload any
	ReplyCh chan<- Response
}

type Event struct {
	Type      string
	Message   string
	OrderID   int
	BotID     int
	Timestamp time.Time
}

type StateSnapshot struct {
	VipQueueLen   int
	NormQueueLen  int
	BotsCount     int
	Completed     int
	CompletedVIP  int
	CompletedNorm int
	IdleBots      int
}

type Response struct {
	State StateSnapshot
	Err   error
}
