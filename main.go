package main

import (
	"fmt"
	"os"
	"time"

	"github.com/MuhdAiman91/se-take-home-assignment/order"
)

// Global variables to manage the order queue, bot manager, and order ID counter
var (
	queue      = order.NewQueue()           // Initializes a new queue to hold pending and completed orders
	botManager = order.NewBotManager(queue) // Initializes a bot manager that will process orders from the queue
	orderID    = 1                          // Tracks the next unique order ID
)

func main() {
	// Capture command-line arguments (excluding the program name)
	args := os.Args[1:]

	// If no arguments are provided, show usage instructions
	if len(args) == 0 {
		fmt.Println("Usage: run.sh [new-normal | new-vip | +bot | -bot]")
		return
	}

	cmd := args[0]                             // Extract the first argument as the command
	timestamp := time.Now().Format("15:04:05") // Format current time for logging

	// Handle the command using a switch statement
	switch cmd {
	case "new-normal":
		// Create a new normal order and add it to the queue
		queue.AddOrder(&order.Order{ID: orderID, Type: order.Normal, CreatedAt: time.Now()})
		fmt.Printf("[%s] New NORMAL order created: #%d\n", timestamp, orderID)

	case "new-vip":
		// Create a new VIP order and add it to the queue (VIPs get priority)
		queue.AddOrder(&order.Order{ID: orderID, Type: order.VIP, CreatedAt: time.Now()})
		fmt.Printf("[%s] New VIP order created: #%d\n", timestamp, orderID)

	case "+bot":
		// Add a new cooking bot to process orders
		botManager.AddBot()
		fmt.Printf("[%s] Bot added\n", timestamp)

	case "-bot":
		// Remove the most recently added bot (if any)
		botManager.RemoveBot()
		fmt.Printf("[%s] Bot removed\n", timestamp)

	default:
		// Handle unknown commands gracefully
		fmt.Printf("[%s] Unknown command: %s\n", timestamp, cmd)
	}

	orderID++ // Increment the order ID for the next order
}