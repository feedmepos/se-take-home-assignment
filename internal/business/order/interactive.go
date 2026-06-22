package order

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"strings"
	"time"
)

// RunInteractive starts an interactive session for managing orders and bots.
// It reads commands from r and writes output to w.
func RunInteractive(w io.Writer, r io.Reader) error {
	rec := NewRecorder(w)
	duration := 10 * time.Second
	c := NewController(WithDuration(duration), WithRecorder(rec))

	fmt.Fprintln(w, "=== McDonald's Order Controller (Interactive) ===")
	fmt.Fprintln(w, "Type 'help' for available commands.")
	fmt.Fprintln(w, "")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		tk := time.NewTicker(500 * time.Millisecond)
		defer tk.Stop()
		for {
			select {
			case <-tk.C:
				c.ProcessCompleted()
			case <-ctx.Done():
				c.ProcessCompleted()
				return
			}
		}
	}()

	scanner := bufio.NewScanner(r)
	prompt := "order> "

	fmt.Fprint(w, prompt)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			fmt.Fprint(w, prompt)
			continue
		}

		parts := strings.Fields(line)
		command := strings.ToLower(parts[0])

		switch command {
		case "exit", "quit", "q":
			fmt.Fprintln(w, "Goodbye!")
			return nil

		case "help":
			printHelp(w)

		case "order":
			if len(parts) < 2 {
				fmt.Fprintln(w, "Usage: order <normal|vip>")
				fmt.Fprint(w, prompt)
				continue
			}
			switch strings.ToLower(parts[1]) {
			case "normal":
				c.NewOrder(OrderNormal)
			case "vip":
				c.NewOrder(OrderVIP)
			default:
				fmt.Fprintf(w, "Unknown order type: %s (use normal or vip)\n", parts[1])
			}

		case "bot":
			if len(parts) < 2 {
				fmt.Fprintln(w, "Usage: bot <add|remove>")
				fmt.Fprint(w, prompt)
				continue
			}
			switch strings.ToLower(parts[1]) {
			case "add":
				c.AddBot()
			case "remove":
				if removed := c.RemoveBot(); removed == nil {
					fmt.Fprintln(w, "No bots to remove.")
				}
			default:
				fmt.Fprintf(w, "Unknown bot action: %s (use add or remove)\n", parts[1])
			}

		case "status":
			printStatus(w, c)

		default:
			fmt.Fprintf(w, "Unknown command: %s (type 'help' for available commands)\n", command)
		}

		fmt.Fprint(w, prompt)
	}

	if err := scanner.Err(); err != nil {
		return err
	}
	return nil
}

func printHelp(w io.Writer) {
	fmt.Fprintln(w, "Available commands:")
	fmt.Fprintln(w, "  order normal       Place a new Normal-priority order")
	fmt.Fprintln(w, "  order vip          Place a new VIP-priority order")
	fmt.Fprintln(w, "  bot add            Add a cooking bot")
	fmt.Fprintln(w, "  bot remove         Remove the newest cooking bot")
	fmt.Fprintln(w, "  status             Show queue, bots, and completed orders")
	fmt.Fprintln(w, "  help               Show this help message")
	fmt.Fprintln(w, "  exit / quit / q    End the session")
}

func printStatus(w io.Writer, c *Controller) {
	pending := c.PendingCount()
	bots := c.BotCount()
	completed := c.CompletedCount()

	fmt.Fprintf(w, "Pending orders: %d\n", pending)
	fmt.Fprintf(w, "Active bots: %d\n", bots)
	fmt.Fprintf(w, "Completed orders: %d\n", completed)
}
