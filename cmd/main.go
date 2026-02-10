package main

import (
	"bufio"
	"fmt"
	"os"
	"os/signal"
	"se-take-home-assignment/internal/controller"
	"se-take-home-assignment/internal/logger"
	"strings"
	"syscall"
	"time"
)

func main() {
	log := logger.New()
	ctrl := controller.NewOrderController(log)

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Start a goroutine to periodically save output
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				saveOutput(log)
			case <-sigChan:
				return
			}
		}
	}()

	// Show welcome message
	fmt.Println("Welcome to McDonald's Order Management System!")
	
	// Start interactive CLI
	runInteractiveCLI(ctrl, log, sigChan)

	// Final save on exit
	saveOutput(log)
	fmt.Println("\nGoodbye!")
}

func runInteractiveCLI(ctrl *controller.OrderController, log *logger.Logger, sigChan chan os.Signal) {
	scanner := bufio.NewScanner(os.Stdin)

	for {
		printMenu()
		fmt.Print("\nEnter your choice: ")

		if !scanner.Scan() {
			break
		}

		choice := strings.TrimSpace(scanner.Text())

		// Handle Ctrl+C
		select {
		case <-sigChan:
			return
		default:
		}

		switch choice {
		case "1":
			orderID := ctrl.CreateNormalOrder()
			fmt.Printf("✓ Normal order #%d created successfully\n", orderID)
			showStatusAfterAction(ctrl)
		case "2":
			orderID := ctrl.CreateVIPOrder()
			fmt.Printf("✓ VIP order #%d created successfully\n", orderID)
			showStatusAfterAction(ctrl)
		case "3":
			botID := ctrl.AddBot()
			fmt.Printf("✓ Bot #%d added successfully\n", botID)
			showStatusAfterAction(ctrl)
		case "4":
			botID := ctrl.RemoveBot()
			if botID == 0 {
				fmt.Println("✗ No bot available to remove")
			} else {
				fmt.Printf("✓ Bot #%d removed successfully\n", botID)
				showStatusAfterAction(ctrl)
			}
		case "5":
			ctrl.PrintStatusToStdout()
		case "6":
			return
		default:
			fmt.Printf("✗ Invalid choice: %s. Please enter a number between 1-6.\n", choice)
		}

		fmt.Println() // Add spacing between interactions
	}
}

func printMenu() {
	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("  McDonald's Order Management System")
	fmt.Println(strings.Repeat("=", 50))
	fmt.Println("  1 - Add normal order")
	fmt.Println("  2 - Add VIP order")
	fmt.Println("  3 - Add bot")
	fmt.Println("  4 - Remove bot")
	fmt.Println("  5 - Show status")
	fmt.Println("  6 - Exit")
	fmt.Println(strings.Repeat("=", 50))
}

// showStatusAfterAction displays status after an action with a small delay
// to allow order assignment/reassignment to complete
func showStatusAfterAction(ctrl *controller.OrderController) {
	time.Sleep(100 * time.Millisecond)
	ctrl.PrintStatusToStdout()
}

func saveOutput(log *logger.Logger) {
	output := log.GetOutput()
	if output != "" {
		err := os.WriteFile("scripts/result.txt", []byte(output), 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error writing result.txt: %v\n", err)
		}
	}
}

