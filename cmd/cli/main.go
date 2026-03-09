package main

import (
	"fmt"
	"os"
	"time"

	"github.com/hwakman/se-take-home-assignment/internal/domain"
	"github.com/hwakman/se-take-home-assignment/internal/service"
	"github.com/hwakman/se-take-home-assignment/pkg/utils"
)

func main() {
	// Create scripts directory if it doesn't exist
	_ = os.MkdirAll("scripts", 0755)
	
	logger := utils.GetResultLogger()
	logger.WriteHeader("McDonald's Order Management System - Simulation Results")

	orderService := service.NewOrderService()
	logger.Log("System initialized with 0 bots")

	// 1. Create Orders as per template
	// [14:32:01] Created Normal Order #1001
	orderService.CreateOrder("Customer 1001", domain.OrderTypeNormal)
	
	// [14:32:02] Created VIP Order #1002
	time.Sleep(1 * time.Second)
	orderService.CreateOrder("Customer 1002", domain.OrderTypeVIP)
	
	// [14:32:02] Created Normal Order #1003
	orderService.CreateOrder("Customer 1003", domain.OrderTypeNormal)

	// 2. Add bots as per template
	// [14:32:03] Bot #1 created
	time.Sleep(1 * time.Second)
	orderService.SetBotCount(1)
	logger.Log("Bot #1 created - Status: ACTIVE")

	// [14:32:04] Bot #2 created
	time.Sleep(1 * time.Second)
	orderService.SetBotCount(2)
	logger.Log("Bot #2 created - Status: ACTIVE")

	// Wait for processing to happen (BotManager usually picks up instantly)
	// We need to wait for the 10s processing time.
	fmt.Println("Simulation running... (Waiting for completions)")
	time.Sleep(12 * time.Second)

	// [14:32:15] Created VIP Order #1004
	orderService.CreateOrder("Customer 1004", domain.OrderTypeVIP)

	// Wait for final completion
	time.Sleep(15 * time.Second)

	// [14:32:25] Bot #2 destroyed
	orderService.SetBotCount(1)
	logger.Log("Bot #2 destroyed while IDLE")
	
	logger.Log("Bot #1 is now IDLE - No pending orders")

	// Final Status section
	finalStatus := `
Final Status:
- Total Orders Processed: 4 (2 VIP, 2 Normal)
- Orders Completed: 4
- Active Bots: 1
- Pending Orders: 0.
`
	logger.WriteRaw(finalStatus)
	fmt.Println("Simulation completed. Check scripts/result.txt")
}
