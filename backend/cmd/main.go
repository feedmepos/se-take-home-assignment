package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"mcd-order-controller/internal"
)

func main() {
	demo := flag.Bool("demo", false, "Run preset demo scenario and exit (used by CI)")
	flag.Parse()

	ctrl := internal.NewController(os.Stdout)

	if *demo {
		runDemo(ctrl)
		return
	}
	runInteractive(ctrl)
}

func runDemo(ctrl *internal.Controller) {
	fmt.Fprintln(os.Stdout, "McDonald's Order Management System - Demo Run")
	fmt.Fprintln(os.Stdout)

	// Use 2s processing time for the demo so the script finishes quickly in CI.
	ctrl.SetProcessingTime(2 * time.Second)

	// 1) Build up a queue showing VIP priority.
	ctrl.AddOrder(internal.OrderNormal) // #1
	ctrl.AddOrder(internal.OrderVIP)    // #2 — jumps ahead of #1
	ctrl.AddOrder(internal.OrderNormal) // #3

	time.Sleep(500 * time.Millisecond)

	// 2) Two bots start working. Bot#1 picks up VIP#2, Bot#2 picks up Normal#1.
	ctrl.AddBot()
	ctrl.AddBot()

	// 3) Mid-process, remove the newest bot — its order should return to PENDING.
	time.Sleep(800 * time.Millisecond)
	ctrl.RemoveBot()

	// 4) Add a bot back; it should immediately resume the returned order.
	time.Sleep(300 * time.Millisecond)
	ctrl.AddBot()

	// 5) Let everything drain.
	time.Sleep(3 * time.Second)

	// 6) Add a VIP order — an idle bot should grab it.
	ctrl.AddOrder(internal.OrderVIP)
	time.Sleep(3 * time.Second)

	// 7) Remove idle bot.
	ctrl.RemoveBot()

	// 8) Final status.
	snap := ctrl.Snapshot()
	fmt.Fprintln(os.Stdout)
	fmt.Fprintln(os.Stdout, "Final Status:")
	fmt.Fprintf(os.Stdout, "- Total Orders Completed: %d\n", len(snap.Complete))
	fmt.Fprintf(os.Stdout, "- Pending Orders: %d\n", len(snap.Pending))
	fmt.Fprintf(os.Stdout, "- Active Bots: %d\n", len(snap.Bots))
}

func runInteractive(ctrl *internal.Controller) {
	fmt.Fprintln(os.Stdout, "McDonald's Order Controller - Interactive Mode")
	fmt.Fprintln(os.Stdout, "Type 'help' for commands, 'quit' to exit.")
	fmt.Fprintln(os.Stdout)

	scanner := bufio.NewScanner(os.Stdin)
	prompt()

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			prompt()
			continue
		}
		if !handleCommand(ctrl, line) {
			return
		}
		prompt()
	}
}

func prompt() {
	fmt.Fprint(os.Stdout, "> ")
}

func handleCommand(ctrl *internal.Controller, line string) bool {
	parts := strings.Fields(line)
	cmd := strings.ToLower(parts[0])

	switch cmd {
	case "help", "?":
		printHelp()

	case "new":
		if len(parts) < 2 {
			fmt.Fprintln(os.Stdout, "Usage: new <normal|vip>")
			return true
		}
		switch strings.ToLower(parts[1]) {
		case "normal", "n":
			ctrl.AddOrder(internal.OrderNormal)
		case "vip", "v":
			ctrl.AddOrder(internal.OrderVIP)
		default:
			fmt.Fprintln(os.Stdout, "Usage: new <normal|vip>")
		}

	case "+bot", "addbot":
		ctrl.AddBot()

	case "-bot", "removebot", "rmbot":
		ctrl.RemoveBot()

	case "status", "s":
		printStatus(ctrl)

	case "quit", "exit", "q":
		fmt.Fprintln(os.Stdout, "Goodbye!")
		return false

	default:
		fmt.Fprintf(os.Stdout, "Unknown command: %q. Type 'help'.\n", line)
	}
	return true
}

func printHelp() {
	fmt.Fprintln(os.Stdout, "Commands:")
	fmt.Fprintln(os.Stdout, "  new normal        Create a normal order")
	fmt.Fprintln(os.Stdout, "  new vip           Create a VIP order")
	fmt.Fprintln(os.Stdout, "  +bot              Add a cooking bot")
	fmt.Fprintln(os.Stdout, "  -bot              Remove the newest bot")
	fmt.Fprintln(os.Stdout, "  status            Show current state")
	fmt.Fprintln(os.Stdout, "  help              Show this help")
	fmt.Fprintln(os.Stdout, "  quit              Exit")
}

func printStatus(ctrl *internal.Controller) {
	s := ctrl.Snapshot()
	fmt.Fprintf(os.Stdout, "PENDING (%d): ", len(s.Pending))
	if len(s.Pending) == 0 {
		fmt.Fprintln(os.Stdout, "-")
	} else {
		ids := make([]string, 0, len(s.Pending))
		for _, o := range s.Pending {
			ids = append(ids, fmt.Sprintf("%s#%d", o.Type, o.ID))
		}
		fmt.Fprintln(os.Stdout, strings.Join(ids, ", "))
	}

	fmt.Fprintf(os.Stdout, "COMPLETE (%d): ", len(s.Complete))
	if len(s.Complete) == 0 {
		fmt.Fprintln(os.Stdout, "-")
	} else {
		ids := make([]string, 0, len(s.Complete))
		for _, o := range s.Complete {
			ids = append(ids, fmt.Sprintf("%s#%d", o.Type, o.ID))
		}
		fmt.Fprintln(os.Stdout, strings.Join(ids, ", "))
	}

	fmt.Fprintf(os.Stdout, "BOTS (%d):\n", len(s.Bots))
	for _, b := range s.Bots {
		if b.Order != nil {
			fmt.Fprintf(os.Stdout, "  Bot#%d  %s -> %s#%d\n", b.ID, b.Status, b.Order.Type, b.Order.ID)
		} else {
			fmt.Fprintf(os.Stdout, "  Bot#%d  %s\n", b.ID, b.Status)
		}
	}
}
