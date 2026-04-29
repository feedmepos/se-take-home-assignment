package mcd

import (
	"bufio"
	"fmt"
	"io"
	"strings"
	"time"
)

// RunREPL starts the interactive command-line interface
func RunREPL(in io.Reader, out io.Writer, processDuration time.Duration) {
	ctrl := NewControllerWithClock(out, RealClock{}, processDuration)
	defer ctrl.Close()

	fmt.Fprintln(out, "McDonald's Order Management System")
	fmt.Fprintln(out, "Type 'help' for available commands")
	fmt.Fprintln(out)

	scanner := bufio.NewScanner(in)
	fmt.Fprint(out, "> ")

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			fmt.Fprint(out, "> ")
			continue
		}

		switch line {
		case "n", "order":
			ctrl.NewNormalOrder()
		case "v", "vip":
			ctrl.NewVIPOrder()
		case "+", "+bot":
			ctrl.AddBot()
		case "-", "-bot":
			if ctrl.RemoveBot() == nil {
				fmt.Fprintln(out, "No bots to remove")
			}
		case "s", "status":
			ctrl.PrintStatus()
		case "h", "help":
			printHelp(out)
		case "q", "quit":
			fmt.Fprintln(out, "Shutting down...")
			return
		default:
			fmt.Fprintf(out, "Unknown command: %s (type 'help' for available commands)\n", line)
		}

		fmt.Fprint(out, "> ")
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(out, "Error reading input: %v\n", err)
	}
}

func printHelp(out io.Writer) {
	fmt.Fprintln(out, "\nAvailable commands:")
	fmt.Fprintln(out, "  n, order    - Create a new Normal order")
	fmt.Fprintln(out, "  v, vip      - Create a new VIP order")
	fmt.Fprintln(out, "  +, +bot     - Add a new bot")
	fmt.Fprintln(out, "  -, -bot     - Remove the newest bot")
	fmt.Fprintln(out, "  s, status   - Show system status")
	fmt.Fprintln(out, "  h, help     - Show this help message")
	fmt.Fprintln(out, "  q, quit     - Exit the program")
	fmt.Fprintln(out)
}
