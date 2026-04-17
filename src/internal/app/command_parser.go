package app

import (
	"fmt"
	"strings"
	"time"

	"se-order/src/internal/protocol"
)

func parseCommand(line string) (command, error) {
	parts := strings.Fields(strings.ToLower(line))
	if len(parts) == 0 {
		return command{}, fmt.Errorf("empty command")
	}

	switch parts[0] {
	case protocol.CommandOrder:
		return parseOrderCommand(line, parts)
	case protocol.CommandBot:
		return parseBotCommand(line, parts)
	case protocol.CommandTick:
		return parseTickCommand(line, parts)
	case protocol.CommandStatus, protocol.CommandHelp, protocol.CommandExit:
		return parseSingleWordCommand(line, parts)
	default:
		return command{}, unknownCommandError(line)
	}
}

func parseOrderCommand(line string, parts []string) (command, error) {
	if len(parts) != 2 {
		return command{}, unknownCommandError(line)
	}

	switch parts[1] {
	case protocol.ArgumentNormal:
		return command{kind: commandOrderNormal}, nil
	case protocol.ArgumentVIP:
		return command{kind: commandOrderVIP}, nil
	default:
		return command{}, unknownCommandError(line)
	}
}

func parseBotCommand(line string, parts []string) (command, error) {
	if len(parts) != 2 {
		return command{}, unknownCommandError(line)
	}

	switch parts[1] {
	case protocol.ArgumentAdd:
		return command{kind: commandBotAdd}, nil
	case protocol.ArgumentRemove:
		return command{kind: commandBotRemove}, nil
	default:
		return command{}, unknownCommandError(line)
	}
}

func parseTickCommand(line string, parts []string) (command, error) {
	if len(parts) != 2 {
		return command{}, unknownCommandError(line)
	}

	duration, err := time.ParseDuration(parts[1])
	if err != nil {
		return command{}, invalidDurationError(line)
	}
	return command{kind: commandTick, duration: duration}, nil
}

func parseSingleWordCommand(line string, parts []string) (command, error) {
	if len(parts) != 1 {
		return command{}, unknownCommandError(line)
	}

	switch parts[0] {
	case protocol.CommandStatus:
		return command{kind: commandStatus}, nil
	case protocol.CommandHelp:
		return command{kind: commandHelp}, nil
	case protocol.CommandExit:
		return command{kind: commandExit}, nil
	default:
		return command{}, unknownCommandError(line)
	}
}

func unknownCommandError(line string) error {
	return fmt.Errorf("unknown command: %q", line)
}

func invalidDurationError(line string) error {
	return fmt.Errorf("invalid duration in command: %q", line)
}
