package cli

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"se-take-home-assignment/internal/order"
	"se-take-home-assignment/internal/types"
	"se-take-home-assignment/internal/view"
)

var errQuit = errors.New("quit")

// Run starts the interactive order-controller CLI.
func Run(in io.Reader, out io.Writer) error {
	controller := order.NewController(time.Date(2026, 6, 19, 9, 0, 0, 0, time.UTC))
	scanner := bufio.NewScanner(in)

	if err := writeWelcome(out, controller.Now()); err != nil {
		return err
	}
	if _, err := fmt.Fprint(out, "order-controller> "); err != nil {
		return err
	}

	for scanner.Scan() {
		line := scanner.Text()
		if err := handleLine(out, controller, line); err != nil {
			if errors.Is(err, errQuit) {
				return nil
			}
			return err
		}
		if _, err := fmt.Fprint(out, "order-controller> "); err != nil {
			return err
		}
	}

	return scanner.Err()
}

func writeWelcome(w io.Writer, now time.Time) error {
	_, err := fmt.Fprintf(w, "McDonald's Order Management System - Interactive CLI\n[%s] System initialized with 0 bots\n%s", now.Format("15:04:05"), helpText())
	return err
}

func handleLine(w io.Writer, controller *order.Controller, line string) error {
	command := strings.TrimSpace(strings.ToLower(line))
	if command == "" {
		return nil
	}

	switch {
	case isHelp(command):
		_, err := fmt.Fprint(w, helpText())
		return err
	case isQuit(command):
		_, err := fmt.Fprintf(w, "[%s] Goodbye\n", controller.Now().Format("15:04:05"))
		if err != nil {
			return err
		}
		return errQuit
	case isNormalOrder(command):
		return view.WriteEvents(w, controller.AddOrder(types.TypeNormal))
	case isVIPOrder(command):
		return view.WriteEvents(w, controller.AddOrder(types.TypeVIP))
	case isAddBot(command):
		return view.WriteEvents(w, controller.AddBot())
	case isRemoveBot(command):
		events, err := controller.RemoveBot()
		if err != nil {
			return writeCommandError(w, controller.Now(), err)
		}
		return view.WriteEvents(w, events)
	case isStatus(command):
		return view.WriteSnapshot(w, controller.Snapshot())
	case isAdvance(command):
		d, err := parseAdvanceDuration(command)
		if err != nil {
			return writeCommandError(w, controller.Now(), err)
		}
		return advanceTime(w, controller, d)
	default:
		return writeCommandError(w, controller.Now(), fmt.Errorf("unknown command %q", line))
	}
}

func helpText() string {
	return "Commands:\n" +
		"  normal | n              create a Normal order\n" +
		"  vip | v                 create a VIP order\n" +
		"  +bot | +                add a cooking bot\n" +
		"  -bot | -                remove the newest bot\n" +
		"  advance 10 | wait 10s   advance simulated time\n" +
		"  status | s              show PENDING/PROCESSING/COMPLETE areas\n" +
		"  help | h                show commands\n" +
		"  quit | q                exit\n"
}

func isHelp(command string) bool {
	return command == "help" || command == "h" || command == "?"
}

func isQuit(command string) bool {
	return command == "quit" || command == "q" || command == "exit"
}

func isNormalOrder(command string) bool {
	switch command {
	case "normal", "n", "normal order", "new normal", "new normal order":
		return true
	default:
		return false
	}
}

func isVIPOrder(command string) bool {
	switch command {
	case "vip", "v", "vip order", "new vip", "new vip order":
		return true
	default:
		return false
	}
}

func isAddBot(command string) bool {
	switch command {
	case "+", "+bot", "+ bot", "add bot", "new bot", "bot +":
		return true
	default:
		return false
	}
}

func isRemoveBot(command string) bool {
	switch command {
	case "-", "-bot", "- bot", "remove bot", "delete bot", "bot -":
		return true
	default:
		return false
	}
}

func isStatus(command string) bool {
	return command == "status" || command == "s"
}

func isAdvance(command string) bool {
	fields := strings.Fields(command)
	if len(fields) != 2 {
		return false
	}
	return fields[0] == "advance" || fields[0] == "wait" || fields[0] == "tick"
}

func parseAdvanceDuration(command string) (time.Duration, error) {
	fields := strings.Fields(command)
	if len(fields) != 2 {
		return 0, errors.New("advance requires a duration, for example: advance 10")
	}

	d, err := time.ParseDuration(fields[1])
	if err != nil {
		seconds, parseErr := strconv.Atoi(fields[1])
		if parseErr != nil {
			return 0, fmt.Errorf("invalid duration %q", fields[1])
		}
		d = time.Duration(seconds) * time.Second
	}
	if d <= 0 {
		return 0, errors.New("duration must be greater than zero")
	}
	return d, nil
}

func advanceTime(w io.Writer, controller *order.Controller, d time.Duration) error {
	events := controller.Advance(d)
	if len(events) > 0 {
		return view.WriteEvents(w, events)
	}
	_, err := fmt.Fprintf(w, "[%s] Advanced simulated time by %s; no orders completed\n", controller.Now().Format("15:04:05"), d)
	return err
}

func writeCommandError(w io.Writer, now time.Time, err error) error {
	_, writeErr := fmt.Fprintf(w, "[%s] ERROR: %v\n", now.Format("15:04:05"), err)
	return writeErr
}
