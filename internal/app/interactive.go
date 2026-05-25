// ABOUTME: Provides the interactive command loop for the order controller CLI.
// ABOUTME: Connects terminal commands to the in-memory order controller.
package app

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"feedme-order-controller/internal/orders"
)

func RunInteractive(reader io.Reader, writer io.Writer) error {
	controller := orders.NewController()
	scanner := bufio.NewScanner(reader)
	currentTime := time.Now().Truncate(time.Second)
	createdOrders := 0
	createdBots := 0

	fmt.Fprintln(writer, "McDonald's Order Management System")
	fmt.Fprintln(writer, "Commands: normal, vip, +, -, status, wait <seconds>, help, quit")

	for {
		fmt.Fprint(writer, "> ")
		if !scanner.Scan() {
			break
		}

		command := strings.TrimSpace(scanner.Text())
		switch {
		case command == "normal":
			createdOrders++
			controller.AddOrder(orders.NormalOrder, currentTime)
			fmt.Fprintf(writer, "Created Normal Order #%d\n", createdOrders)
		case command == "vip":
			createdOrders++
			controller.AddOrder(orders.VIPOrder, currentTime)
			fmt.Fprintf(writer, "Created VIP Order #%d\n", createdOrders)
		case command == "+":
			createdBots++
			controller.AddBot(currentTime)
			fmt.Fprintf(writer, "Bot #%d created\n", createdBots)
		case command == "-":
			controller.RemoveNewestBot(currentTime)
			fmt.Fprintln(writer, "Newest bot removed")
		case command == "status":
			writeStatus(writer, controller.Snapshot())
		case strings.HasPrefix(command, "wait "):
			seconds, err := waitSeconds(command)
			if err != nil {
				fmt.Fprintf(writer, "Invalid wait command: %v\n", err)
				continue
			}
			duration := time.Duration(seconds) * time.Second
			time.Sleep(duration)
			currentTime = currentTime.Add(duration)
			controller.AdvanceTo(currentTime)
			fmt.Fprintf(writer, "Advanced %d seconds\n", seconds)
		case command == "help":
			fmt.Fprintln(writer, "Commands: normal, vip, +, -, status, wait <seconds>, help, quit")
		case command == "quit":
			fmt.Fprintln(writer, "Goodbye")
			return scanner.Err()
		case command == "":
			continue
		default:
			fmt.Fprintf(writer, "Unknown command: %s\n", command)
		}
	}

	return scanner.Err()
}

func waitSeconds(command string) (int, error) {
	parts := strings.Fields(command)
	if len(parts) != 2 {
		return 0, fmt.Errorf("expected wait <seconds>")
	}

	seconds, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, err
	}
	if seconds < 0 {
		return 0, fmt.Errorf("seconds must be non-negative")
	}
	return seconds, nil
}

func writeStatus(writer io.Writer, snapshot orders.Snapshot) {
	fmt.Fprintf(writer, "Pending Orders: %d\n", len(snapshot.PendingOrders))
	fmt.Fprintf(writer, "Processing Orders: %d\n", processingOrders(snapshot))
	fmt.Fprintf(writer, "Completed Orders: %d\n", len(snapshot.CompletedOrders))
	fmt.Fprintf(writer, "Active Bots: %d\n", len(snapshot.Bots))
}

func processingOrders(snapshot orders.Snapshot) int {
	total := 0
	for _, bot := range snapshot.Bots {
		if bot.CurrentOrder != nil {
			total++
		}
	}
	return total
}
