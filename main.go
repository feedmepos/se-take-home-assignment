package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"
)

func runDemo() {
	fmt.Println("=== McDonald's Order Control System ===")
	fmt.Println()

	controller := NewOrderController()

	fmt.Println("--- Scenario 1: Add normal orders ---")
	controller.AddNormalOrder()
	controller.AddNormalOrder()
	time.Sleep(200 * time.Millisecond)

	fmt.Println()
	fmt.Println("--- Scenario 2: Add VIP order (should be prioritized) ---")
	controller.AddVIPOrder()
	time.Sleep(200 * time.Millisecond)

	fmt.Println()
	fmt.Println("--- Scenario 3: Add first bot (starts processing VIP order) ---")
	controller.AddBot()
	time.Sleep(500 * time.Millisecond)

	fmt.Println()
	fmt.Println("--- Scenario 4: Add another normal order ---")
	controller.AddNormalOrder()
	time.Sleep(200 * time.Millisecond)

	fmt.Println()
	fmt.Println("--- Scenario 5: Add second bot (processes next order) ---")
	controller.AddBot()
	time.Sleep(500 * time.Millisecond)

	fmt.Println()
	fmt.Println("--- Scenario 6: Remove a bot ---")
	controller.RemoveBot()
	time.Sleep(200 * time.Millisecond)

	fmt.Println()
	fmt.Println("--- Scenario 7: Wait for orders to complete ---")
	time.Sleep(12 * time.Second)

	fmt.Println()
	fmt.Println("=== Final Status ===")
	fmt.Printf("Total Orders Created: %d\n", controller.nextOrderID-1)
	fmt.Printf("Pending Orders: %d\n", controller.GetPendingCount())
	fmt.Printf("Active Bots: %d\n", controller.GetBotCount())
	fmt.Printf("Completed Orders: %d\n", controller.GetCompletedCount())
	fmt.Println()
	fmt.Println("=== System Demo Completed ===")
}

func runInteractive() {
	fmt.Println("=== McDonald's Order Control System ===")
	fmt.Println("Interactive CLI Mode")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  normal  - Add a normal order")
	fmt.Println("  vip     - Add a VIP order")
	fmt.Println("  +bot    - Add a cooking bot")
	fmt.Println("  -bot    - Remove a cooking bot")
	fmt.Println("  status  - Show current status")
	fmt.Println("  quit    - Exit the system")
	fmt.Println()

	controller := NewOrderController()
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

		switch strings.ToLower(input) {
		case "normal":
			controller.AddNormalOrder()
		case "vip":
			controller.AddVIPOrder()
		case "+bot", "addbot", "add bot":
			controller.AddBot()
		case "-bot", "removebot", "remove bot":
			controller.RemoveBot()
		case "status":
			controller.printStatus()
		case "quit", "exit", "q":
			fmt.Println("\nShutting down system...")

			pendingCount := controller.GetPendingCount()
			completedCount := controller.GetCompletedCount()
			fmt.Printf("Final Status: %d orders completed, %d orders pending\n",
				completedCount, pendingCount)
			fmt.Println("Goodbye!")
			return
		default:
			fmt.Printf("Unknown command: %s\n", input)
			fmt.Println("Available commands: normal, vip, +bot, -bot, status, quit")
		}

		time.Sleep(100 * time.Millisecond)
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Error reading input: %v\n", err)
		os.Exit(1)
	}
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--interactive" {
		runInteractive()
	} else {
		runDemo()
	}
}
