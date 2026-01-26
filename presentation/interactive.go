package presentation

import (
	"bufio"
	"feedme-takehome/services"
	"fmt"
	"os"
	"strings"
	"sync"
)

var promptMu sync.Mutex

// RunInteractive starts the interactive command loop
func (app *App) RunInteractive() {
	app.printWelcome()

	reader := bufio.NewReader(os.Stdin)

	for {
		promptMu.Lock()
		fmt.Print("Enter command> ")
		promptMu.Unlock()

		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Println("Error reading input:", err)
			continue
		}

		command := strings.TrimSpace(strings.ToLower(input))

		if command == "" {
			continue
		}

		fmt.Println()

		if !app.executeCommand(command) {
			break
		}
	}

	app.printSessionSummary()
}

// CreateEventHandler returns an event handler that reprints the prompt after async events
func (app *App) CreateEventHandler() services.EventHandler {
	return func(event services.ProcessingEvent) {
		app.cli.HandleProcessingEvent(event)
		reprintPrompt()
	}
}

func reprintPrompt() {
	promptMu.Lock()
	defer promptMu.Unlock()
	fmt.Print("\nEnter command> ")
}

func (app *App) executeCommand(command string) bool {
	switch command {
	case "1", "add bot", "add-bot":
		if cmd := app.GetCommand("add-bot"); cmd != nil {
			cmd.Run(cmd, nil)
		}
	case "2", "remove bot", "remove-bot":
		if cmd := app.GetCommand("remove-bot"); cmd != nil {
			cmd.Run(cmd, nil)
		}
	case "3", "add order", "add-order":
		if cmd := app.GetCommand("add-order"); cmd != nil {
			cmd.Run(cmd, nil)
		}
	case "4", "add vip order", "add-vip-order", "add vip":
		if cmd := app.GetCommand("add-vip-order"); cmd != nil {
			cmd.Run(cmd, nil)
		}
	case "5", "status":
		if cmd := app.GetCommand("status"); cmd != nil {
			cmd.Run(cmd, nil)
		}
	case "6", "help":
		app.printAvailableCommands()
	case "7", "exit", "quit", "q":
		fmt.Println("Exiting...")
		return false
	default:
		fmt.Printf("Unknown command: '%s'. Type 'help' for available commands.\n\n", command)
	}
	return true
}

func (app *App) printWelcome() {
	fmt.Println()
	fmt.Println("╔════════════════════════════════════════════════════════════════╗")
	fmt.Println("║       McDonald's Order Management System - Interactive CLI     ║")
	fmt.Println("╚════════════════════════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Welcome! This system manages food orders using cooking bots.")
	fmt.Println()
	fmt.Println("How it works:")
	fmt.Println("  • Bots process orders in REAL-TIME (10 seconds per order)")
	fmt.Println("  • VIP orders have priority over normal orders")
	fmt.Println("  • When a bot is removed while processing, the order returns to queue")
	fmt.Println("  • You can continue entering commands while orders are being processed")
	fmt.Println()
	app.printAvailableCommands()
}

func (app *App) printAvailableCommands() {
	fmt.Println("Available commands:")
	fmt.Println("  1. add bot       - Add a new cooking bot")
	fmt.Println("  2. remove bot    - Remove the most recently added bot")
	fmt.Println("  3. add order     - Create a new normal order")
	fmt.Println("  4. add vip order - Create a new VIP order (priority)")
	fmt.Println("  5. status        - Show current system status")
	fmt.Println("  6. help          - Show this help message")
	fmt.Println("  7. exit          - Exit the program")
	fmt.Println()
}

func (app *App) printSessionSummary() {
	completed, vipCompleted, normalCompleted := app.cli.GetProcessingStats()

	fmt.Println()
	fmt.Println("╔════════════════════════════════════════════════════════════════╗")
	fmt.Println("║                        SESSION SUMMARY                         ║")
	fmt.Println("╚════════════════════════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Session Activity:")
	fmt.Printf("  • Normal orders created: %d\n", app.stats.NormalOrdersCreated)
	fmt.Printf("  • VIP orders created:    %d\n", app.stats.VIPOrdersCreated)
	fmt.Printf("  • Total orders created:  %d\n", app.stats.NormalOrdersCreated+app.stats.VIPOrdersCreated)
	fmt.Printf("  • Bots added:            %d\n", app.stats.BotsAdded)
	fmt.Printf("  • Bots removed:          %d\n", app.stats.BotsRemoved)
	fmt.Println()
	fmt.Println("Orders Completed:")
	fmt.Printf("  • Total completed:       %d\n", completed)
	fmt.Printf("  • VIP completed:         %d\n", vipCompleted)
	fmt.Printf("  • Normal completed:      %d\n", normalCompleted)
	fmt.Println()

	app.cli.PrintStatus()
	fmt.Println()
	fmt.Println("Thank you for using McDonald's Order Management System!")
	fmt.Println()
}
