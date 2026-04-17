package app

import (
	"fmt"

	"se-order/src/internal/core/model"
)

func (r *Runner) Execute(line string) (bool, error) {
	command, err := parseCommand(line)
	if err != nil {
		return false, err
	}
	return r.executeCommand(command)
}

func (r *Runner) executeCommand(command command) (bool, error) {
	switch command.kind {
	case commandOrderNormal, commandOrderVIP:
		return r.executeOrderCommand(command)
	case commandBotAdd, commandBotRemove:
		return r.executeBotCommand(command)
	case commandTick:
		return r.executeTickCommand(command)
	case commandStatus, commandHelp, commandExit:
		return r.executeSingleWordCommand(command)
	default:
		return false, fmt.Errorf("unsupported command")
	}
}

func (r *Runner) executeOrderCommand(command command) (bool, error) {
	switch command.kind {
	case commandOrderNormal:
		return false, r.writeEvents(r.controller.NewOrder(model.PriorityNormal))
	case commandOrderVIP:
		return false, r.writeEvents(r.controller.NewOrder(model.PriorityVIP))
	default:
		return false, fmt.Errorf("unsupported order command")
	}
}

func (r *Runner) executeBotCommand(command command) (bool, error) {
	switch command.kind {
	case commandBotAdd:
		return false, r.writeEvents(r.controller.AddBot())
	case commandBotRemove:
		events, err := r.controller.RemoveBot()
		if err != nil {
			return false, err
		}
		return false, r.writeEvents(events)
	default:
		return false, fmt.Errorf("unsupported bot command")
	}
}

func (r *Runner) executeTickCommand(command command) (bool, error) {
	events, err := r.controller.Tick(command.duration)
	if err != nil {
		return false, err
	}
	return false, r.writeEvents(events)
}

func (r *Runner) executeSingleWordCommand(command command) (bool, error) {
	switch command.kind {
	case commandStatus:
		return false, r.writeStatus()
	case commandHelp:
		return false, r.writeHelp()
	case commandExit:
		if err := r.writer.Line(r.now(), "exit"); err != nil {
			return false, err
		}
		return true, nil
	default:
		return false, fmt.Errorf("unsupported single word command")
	}
}
