package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"se-take-home-assignment/internal/order"
)

func main() {
	if err := run(os.Args[1:], os.Stdin, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string, stdin io.Reader, stdout io.Writer) error {
	command := "run"
	if len(args) > 0 {
		command = args[0]
	}

	switch command {
	case "run", "demo", "simulate":
		runDemo(stdout)
	case "interactive", "shell":
		return runInteractive(stdin, stdout)
	case "help", "-h", "--help":
		printUsage(stdout)
	default:
		return fmt.Errorf("unknown command %q; run with --help for usage", command)
	}

	return nil
}

func runDemo(stdout io.Writer) {
	controller := order.NewController(demoStart())

	controller.AddNormalOrder()
	controller.Advance(time.Second)
	controller.AddVIPOrder()
	controller.Advance(time.Second)
	controller.AddNormalOrder()
	controller.Advance(time.Second)

	controller.AddBot()
	controller.Advance(time.Second)
	controller.AddBot()
	controller.Advance(4 * time.Second)

	controller.RemoveBot()
	controller.AddVIPOrder()
	controller.AddBot()

	controller.Advance(5 * time.Second)
	controller.Advance(5 * time.Second)
	controller.Advance(10 * time.Second)
	controller.RemoveBot()

	writeReport(stdout, controller)
}

func runInteractive(stdin io.Reader, stdout io.Writer) error {
	controller := order.NewController(demoStart())
	seenEvents := 0

	fmt.Fprintln(stdout, "Interactive order controller. Type help for commands.")
	printNewEvents(stdout, controller, &seenEvents)

	scanner := bufio.NewScanner(stdin)
	for {
		fmt.Fprint(stdout, "> ")
		if !scanner.Scan() {
			fmt.Fprintln(stdout)
			return scanner.Err()
		}

		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		quit, err := handleInteractiveCommand(line, controller, stdout)
		if err != nil {
			fmt.Fprintf(stdout, "[%s] ERROR: %s\n", controller.Now().Format("15:04:05"), err)
			continue
		}
		if quit {
			writeFinalStatus(stdout, controller)
			return nil
		}
		printNewEvents(stdout, controller, &seenEvents)
	}
}

func handleInteractiveCommand(line string, controller *order.Controller, stdout io.Writer) (bool, error) {
	fields := strings.Fields(strings.ToLower(line))
	if len(fields) == 0 {
		return false, nil
	}

	switch fields[0] {
	case "normal", "n":
		controller.AddNormalOrder()
	case "vip", "v":
		controller.AddVIPOrder()
	case "+bot", "bot+", "add-bot":
		controller.AddBot()
	case "-bot", "bot-", "remove-bot":
		controller.RemoveBot()
	case "tick", "advance":
		if len(fields) != 2 {
			return false, fmt.Errorf("%s requires a number of seconds", fields[0])
		}
		seconds, err := strconv.Atoi(fields[1])
		if err != nil || seconds < 0 {
			return false, fmt.Errorf("seconds must be a non-negative integer")
		}
		controller.Advance(time.Duration(seconds) * time.Second)
	case "status":
		writeFinalStatus(stdout, controller)
	case "help":
		printUsage(stdout)
	case "quit", "exit":
		return true, nil
	default:
		return false, fmt.Errorf("unknown command %q", fields[0])
	}

	return false, nil
}

func printUsage(stdout io.Writer) {
	fmt.Fprintln(stdout, "Usage:")
	fmt.Fprintln(stdout, "  order-controller run")
	fmt.Fprintln(stdout, "  order-controller interactive")
	fmt.Fprintln(stdout, "")
	fmt.Fprintln(stdout, "Interactive commands:")
	fmt.Fprintln(stdout, "  normal      create a normal order")
	fmt.Fprintln(stdout, "  vip         create a VIP order")
	fmt.Fprintln(stdout, "  +bot        add a cooking bot")
	fmt.Fprintln(stdout, "  -bot        remove the newest cooking bot")
	fmt.Fprintln(stdout, "  tick <sec>  advance the simulation clock")
	fmt.Fprintln(stdout, "  status      print current state")
	fmt.Fprintln(stdout, "  quit        exit")
}

func writeReport(stdout io.Writer, controller *order.Controller) {
	fmt.Fprintf(stdout, "[%s] McDonald's Order Management System - Simulation Results\n", demoStart().Format("15:04:05"))
	for _, event := range controller.Events() {
		fmt.Fprintln(stdout, event.String())
	}
	writeFinalStatus(stdout, controller)
}

func writeFinalStatus(stdout io.Writer, controller *order.Controller) {
	now := controller.Now().Format("15:04:05")
	summary := controller.Summary()
	snapshot := controller.Snapshot()

	fmt.Fprintf(stdout, "[%s] Final Status: Orders Created=%d (%d VIP, %d Normal)\n", now, summary.OrdersCreated, summary.VIPCreated, summary.NormalCreated)
	fmt.Fprintf(stdout, "[%s] Final Status: Orders Completed=%d\n", now, summary.OrdersComplete)
	fmt.Fprintf(stdout, "[%s] Final Status: Active Bots=%d, Pending=%d, Processing=%d\n", now, summary.ActiveBots, summary.PendingOrders, summary.Processing)
	fmt.Fprintf(stdout, "[%s] Pending Queue: %s\n", now, formatOrderViews(snapshot.Pending))
	fmt.Fprintf(stdout, "[%s] Processing Orders: %s\n", now, formatProcessingViews(snapshot.Processing))
	fmt.Fprintf(stdout, "[%s] Complete Orders: %s\n", now, formatOrderViews(snapshot.Completed))
}

func printNewEvents(stdout io.Writer, controller *order.Controller, seenEvents *int) {
	events := controller.Events()
	for _, event := range events[*seenEvents:] {
		fmt.Fprintln(stdout, event.String())
	}
	*seenEvents = len(events)
}

func formatOrderViews(orders []order.OrderView) string {
	if len(orders) == 0 {
		return "[]"
	}

	parts := make([]string, 0, len(orders))
	for _, order := range orders {
		parts = append(parts, fmt.Sprintf("%s#%d", order.Kind, order.ID))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func formatProcessingViews(orders []order.ProcessingView) string {
	if len(orders) == 0 {
		return "[]"
	}

	parts := make([]string, 0, len(orders))
	for _, processing := range orders {
		parts = append(parts, fmt.Sprintf("Bot#%d->%s#%d", processing.BotID, processing.Kind, processing.OrderID))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func demoStart() time.Time {
	return time.Date(2026, 7, 2, 8, 0, 0, 0, time.UTC)
}
