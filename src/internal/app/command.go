package app

import "time"

type commandType string

const (
	commandOrderNormal commandType = "order_normal"
	commandOrderVIP    commandType = "order_vip"
	commandBotAdd      commandType = "bot_add"
	commandBotRemove   commandType = "bot_remove"
	commandTick        commandType = "tick"
	commandStatus      commandType = "status"
	commandHelp        commandType = "help"
	commandExit        commandType = "exit"
)

type command struct {
	kind     commandType
	duration time.Duration
}
