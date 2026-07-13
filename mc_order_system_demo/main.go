package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	system := NewOrderSystem()

	fmt.Println("=== McDonald's Order Management System ===")
	fmt.Println("Interactive CLI - Type 'help' for available commands")
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}

		command := strings.ToLower(input)

		switch command {
		case "help", "?":
			printHelp()

		case "new normal", "new normal order", "normal":
			order := system.CreateOrder(OrderTypeNormal)
			fmt.Printf("[%s] Created normal order #%d\n", FormatTime(order.CreatedAt), order.ID)

		case "new vip", "new vip order", "vip":
			order := system.CreateOrder(OrderTypeVIP)
			fmt.Printf("[%s] Created VIP order #%d\n", FormatTime(order.CreatedAt), order.ID)

		case "+bot", "add bot", "create bot":
			bot := system.CreateBot()
			fmt.Printf("Created bot #%d\n", bot.ID)

		case "-bot", "remove bot", "delete bot":
			if system.RemoveBot() {
				fmt.Println("Removed the newest bot")
			} else {
				fmt.Println("No bots to remove")
			}

		case "status", "stat", "stats":
			printStatus(system)

		case "pending":
			printPendingOrders(system)

		case "completed":
			printCompletedOrders(system)

		case "bots":
			printBots(system)

		case "result", "save":
			result := system.PrintResult()
			err := os.WriteFile("result.txt", []byte(result), 0644)
			if err != nil {
				fmt.Printf("Error writing to result.txt: %v\n", err)
			} else {
				fmt.Println("Result saved to result.txt")
			}

		case "clear":
			// Clear screen (works on most terminals)
			fmt.Print("\033[H\033[2J")

		case "quit", "exit", "q":
			fmt.Println("Goodbye!")
			return

		default:
			fmt.Printf("Unknown command: %s\n", input)
			fmt.Println("Type 'help' for available commands")
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Error reading input: %v\n", err)
	}
}

func printHelp() {
	fmt.Println("\n=== Available Commands ===")
	fmt.Println("Order Management:")
	fmt.Println("  new normal    - Create a new normal order")
	fmt.Println("  new vip       - Create a new VIP order")
	fmt.Println("  pending       - Show pending orders")
	fmt.Println("  completed     - Show completed orders")
	fmt.Println()
	fmt.Println("Bot Management:")
	fmt.Println("  +bot          - Create a new bot")
	fmt.Println("  -bot          - Remove the newest bot")
	fmt.Println("  bots          - Show all bots")
	fmt.Println()
	fmt.Println("System:")
	fmt.Println("  status        - Show system status")
	fmt.Println("  result        - Save current state to result.txt")
	fmt.Println("  clear         - Clear screen")
	fmt.Println("  quit          - Exit the program")
	fmt.Println()
}

func printStatus(system *OrderSystem) {
	stats := system.GetStats()
	fmt.Println("\n=== System Status ===")
	fmt.Printf("Pending Orders: VIP=%d, Normal=%d\n", stats["pending_vip"], stats["pending_normal"])
	fmt.Printf("Completed Orders: %d\n", stats["completed"])
	fmt.Printf("Bots: Total=%d, Idle=%d, Working=%d\n\n", stats["bots_total"], stats["bots_idle"], stats["bots_working"])
}

func printPendingOrders(system *OrderSystem) {
	pending := system.GetAllPendingOrders()
	fmt.Println("\n=== Pending Orders ===")
	if len(pending) == 0 {
		fmt.Println("No pending orders")
	} else {
		for _, order := range pending {
			fmt.Printf("Order #%d (%s) - Created at %s\n", order.ID, order.Type, FormatTime(order.CreatedAt))
		}
	}
	fmt.Println()
}

func printCompletedOrders(system *OrderSystem) {
	completed := system.GetAllCompletedOrders()
	fmt.Println("\n=== Completed Orders ===")
	if len(completed) == 0 {
		fmt.Println("No completed orders")
	} else {
		for _, order := range completed {
			fmt.Printf("Order #%d (%s) - Created at %s\n", order.ID, order.Type, FormatTime(order.CreatedAt))
		}
	}
	fmt.Println()
}

func printBots(system *OrderSystem) {
	bots := system.GetAllBots()
	fmt.Println("\n=== Bots ===")
	if len(bots) == 0 {
		fmt.Println("No bots")
	} else {
		for _, bot := range bots {
			if bot.IsIdle {
				fmt.Printf("Bot #%d: IDLE\n", bot.ID)
			} else if bot.CurrentOrder != nil {
				fmt.Printf("Bot #%d: Processing Order #%d\n", bot.ID, bot.CurrentOrder.ID)
			}
		}
	}
	fmt.Println()
}
