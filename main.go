package main

import (
	"assignment/internal/controller"
	"assignment/internal/order"
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"
)

var resultFile *os.File

func main() {
	// Open scripts/result.txt for writing (append mode)
	var err error
	// Ensure scripts directory exists
	os.MkdirAll("scripts", 0755)
	resultFile, err = os.OpenFile("scripts/result.txt", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		fmt.Printf("Warning: Could not open scripts/result.txt: %v\n", err)
		resultFile = nil
	}
	defer func() {
		if resultFile != nil {
			resultFile.Close()
		}
	}()

	// Create controller with logger that writes to stdout and filtered to result.txt
	logger := func(msg string) {
		// Always print to stdout
		fmt.Println(msg)
		
		// Only write order-related events to result.txt
		if resultFile != nil && isOrderEvent(msg) {
			fmt.Fprintln(resultFile, msg)
			resultFile.Sync() // Ensure it's written immediately
		}
	}
	
	ctrl := controller.NewController(logger)
	
	// Log system initialization (not to result.txt)
	timestamp := time.Now().Format("15:04:05")
	fmt.Printf("[%s] System initialized\n", timestamp)
	fmt.Println("\n=== McDonald's Order Management System ===")
	
	scanner := bufio.NewScanner(os.Stdin)
	
	for {
		printMenu()
		fmt.Print("\nSelect an action: ")
		
		if !scanner.Scan() {
			break
		}
		
		choice := strings.TrimSpace(scanner.Text())
		
		switch choice {
		case "1":
			ctrl.CreateNormalOrder()
		case "2":
			ctrl.CreateVIPOrder()
		case "3":
			ctrl.AddBot()
		case "4":
			if !ctrl.RemoveBot() {
				fmt.Println("No bots available to remove.")
			}
		case "5":
			printStatus(ctrl)
		case "6":
			printSummary(ctrl)
		case "7":
			fmt.Println("\nExiting system. Goodbye!")
			return
		default:
			fmt.Println("Invalid choice. Please select 1-7.")
		}
		
		// Small delay for readability
		time.Sleep(200 * time.Millisecond)
	}
}

func printMenu() {
	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("MENU:")
	fmt.Println("  1. Create Normal Order")
	fmt.Println("  2. Create VIP Order")
	fmt.Println("  3. Add Bot (+ Bot)")
	fmt.Println("  4. Remove Bot (- Bot)")
	fmt.Println("  5. View Current Status")
	fmt.Println("  6. View Summary")
	fmt.Println("  7. Exit")
	fmt.Println(strings.Repeat("=", 50))
}

func printStatus(ctrl *controller.Controller) {
	vipOrders := ctrl.GetVIPOrders()
	normalOrders := ctrl.GetNormalOrders()
	_, bots := ctrl.GetState()
	
	fmt.Println("\n" + strings.Repeat("-", 50))
	fmt.Println("CURRENT STATUS")
	fmt.Println(strings.Repeat("-", 50))
	
	// VIP Orders
	fmt.Println("\nVIP Orders:")
	if len(vipOrders) == 0 {
		fmt.Println("  (No VIP orders)")
	} else {
		for _, o := range vipOrders {
			fmt.Printf("  Order #%d - Status: %s", o.ID, o.Status)
			if o.Status == order.PROCESSING {
				fmt.Print(" Processing...")
			} else if o.Status == order.COMPLETE {
				fmt.Printf(" (Completed at: %s)", o.CompletedAt.Format("15:04:05"))
			}
			fmt.Println()
		}
	}
	
	// Normal Orders
	fmt.Println("\nNormal Orders:")
	if len(normalOrders) == 0 {
		fmt.Println("  (No Normal orders)")
	} else {
		for _, o := range normalOrders {
			fmt.Printf("  Order #%d - Status: %s", o.ID, o.Status)
			if o.Status == order.PROCESSING {
				fmt.Print(" Processing...")
			} else if o.Status == order.COMPLETE {
				fmt.Printf(" (Completed at: %s)", o.CompletedAt.Format("15:04:05"))
			}
			fmt.Println()
		}
	}
	
	// Bots
	fmt.Println("\nBots:")
	if len(bots) == 0 {
		fmt.Println("  (No bots)")
	} else {
		for _, b := range bots {
			fmt.Printf("  Bot #%d - Status: %s", b.ID, b.Status)
			if b.IsProcessing() && b.CurrentOrder != nil {
				fmt.Printf(" (Processing Order #%d)", b.CurrentOrder.ID)
			}
			fmt.Println()
		}
	}
	
	// Pending counts
	pending := ctrl.GetPendingOrders()
	fmt.Printf("\nPending Orders: %d\n", len(pending))
	fmt.Println(strings.Repeat("-", 50))
}

func printSummary(ctrl *controller.Controller) {
	vipOrders := ctrl.GetVIPOrders()
	normalOrders := ctrl.GetNormalOrders()
	_, bots := ctrl.GetState()
	
	allOrders := make([]*order.Order, 0, len(vipOrders)+len(normalOrders))
	allOrders = append(allOrders, vipOrders...)
	allOrders = append(allOrders, normalOrders...)
	
	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("SYSTEM SUMMARY")
	fmt.Println(strings.Repeat("=", 50))
	
	fmt.Printf("\nTotal Orders: %d\n", len(allOrders))
	fmt.Printf("Total Bots: %d\n", len(bots))
	
	// Count by status
	pendingCount := 0
	processingCount := 0
	completeCount := 0
	
	for _, o := range allOrders {
		switch o.Status {
		case order.PENDING:
			pendingCount++
		case order.PROCESSING:
			processingCount++
		case order.COMPLETE:
			completeCount++
		}
	}
	
	fmt.Printf("\nOrder Status Summary:\n")
	fmt.Printf("  PENDING: %d\n", pendingCount)
	fmt.Printf("  PROCESSING: %d\n", processingCount)
	fmt.Printf("  COMPLETE: %d\n", completeCount)
	
	// Count by type
	normalCount := len(normalOrders)
	vipCount := len(vipOrders)
	
	fmt.Printf("\nOrder Type Summary:\n")
	fmt.Printf("  Normal: %d\n", normalCount)
	fmt.Printf("  VIP: %d\n", vipCount)
	
	// Bot status
	idleCount := 0
	processingBotCount := 0
	
	for _, b := range bots {
		if b.IsIdle() {
			idleCount++
		} else {
			processingBotCount++
		}
	}
	
	fmt.Printf("\nBot Status Summary:\n")
	fmt.Printf("  IDLE: %d\n", idleCount)
	fmt.Printf("  PROCESSING: %d\n", processingBotCount)
	
	// List all orders by type
	fmt.Printf("\nAll VIP Orders:\n")
	if len(vipOrders) == 0 {
		fmt.Println("  (None)")
	} else {
		for _, o := range vipOrders {
			fmt.Printf("  Order #%d - Status: %s", o.ID, o.Status)
			if o.Status == order.COMPLETE && !o.CompletedAt.IsZero() {
				fmt.Printf(" (Completed at: %s)", o.CompletedAt.Format("15:04:05"))
			}
			fmt.Println()
		}
	}
	
	fmt.Printf("\nAll Normal Orders:\n")
	if len(normalOrders) == 0 {
		fmt.Println("  (None)")
	} else {
		for _, o := range normalOrders {
			fmt.Printf("  Order #%d - Status: %s", o.ID, o.Status)
			if o.Status == order.COMPLETE && !o.CompletedAt.IsZero() {
				fmt.Printf(" (Completed at: %s)", o.CompletedAt.Format("15:04:05"))
			}
			fmt.Println()
		}
	}
	
	// List all bots
	fmt.Printf("\nAll Bots:\n")
	if len(bots) == 0 {
		fmt.Println("  (None)")
	} else {
		for _, b := range bots {
			fmt.Printf("  Bot #%d - Status: %s", b.ID, b.Status)
			if b.IsProcessing() && b.CurrentOrder != nil {
				fmt.Printf(" (Processing Order #%d)", b.CurrentOrder.ID)
			}
			fmt.Println()
		}
	}
	
	fmt.Println(strings.Repeat("=", 50))
}

// isOrderEvent checks if a log message is order-related and should be written to result.txt
// Only includes:
// 1. Order created (comes in) - Status: PENDING
// 2. Order returned to PENDING
// 3. Order started processing - Status: PROCESSING
// 4. Order completed - Status: COMPLETE
func isOrderEvent(msg string) bool {
	// Check for order-related messages
	if strings.Contains(msg, "Order #") {
		// Include: Order created, Order processing, Order completed, Order returned to PENDING
		if strings.Contains(msg, "created - Status: PENDING") ||
			strings.Contains(msg, "started processing Order #") ||
			strings.Contains(msg, "completed by Bot #") ||
			strings.Contains(msg, "returned to PENDING") {
			return true
		}
	}
	return false
}
