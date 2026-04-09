package main

import (
	"fmt"
	"os"
	"sync"
	"time"

	order2 "github.com/feedme/order-controller/internal/dao/order"
	"github.com/feedme/order-controller/internal/service/bot"
	"github.com/feedme/order-controller/internal/service/order"
	"github.com/feedme/order-controller/pkg/util"
	"github.com/spf13/cobra"
)

var (
	orderMgr    *order.Manager
	botMgr      *bot.Manager
	outputChan  chan string
	outputMutex sync.Mutex
)

func initManagers() {
	outputChan = make(chan string, 1000)
	orderMgr = order.NewManager()
	botMgr = bot.NewManager(orderMgr, outputChan)
}

func main() {
	initManagers()

	var rootCmd = &cobra.Command{
		Use:   "order-controller",
		Short: "McDonald's order controller with cooking bot simulation",
	}

	rootCmd.AddCommand(newNormalOrderCmd())
	rootCmd.AddCommand(newVIPOrderCmd())
	rootCmd.AddCommand(addBotCmd())
	rootCmd.AddCommand(removeBotCmd())
	rootCmd.AddCommand(simulateCmd())

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func newNormalOrderCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "new-normal",
		Short: "Create a new normal order",
		Run: func(cmd *cobra.Command, args []string) {
			o := orderMgr.CreateOrder(order2.Normal)
			fmt.Printf("[%s] Created Normal Order #%d - Status: %d\n", util.FormatTimestamp(), o.Id, o.Status)
		},
	}
}

func newVIPOrderCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "new-vip",
		Short: "Create a new VIP order",
		Run: func(cmd *cobra.Command, args []string) {
			o := orderMgr.CreateOrder(order2.VIP)
			fmt.Printf("[%s] Created VIP Order #%d - Status: %d\n", util.FormatTimestamp(), o.Id, o.Status)
		},
	}
}

func addBotCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "add-bot",
		Short: "Add a new cooking bot",
		Run: func(cmd *cobra.Command, args []string) {
			botMgr.AddBot()
		},
	}
}

func removeBotCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "remove-bot",
		Short: "Remove the newest cooking bot",
		Run: func(cmd *cobra.Command, args []string) {
			if !botMgr.RemoveNewestBot() {
				fmt.Println("No bots to remove")
			}
		},
	}
}

func simulateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "simulate",
		Short: "Run simulation demo",
		Run: func(cmd *cobra.Command, args []string) {
			runSimulation()
		},
	}
}

// runSimulation runs a simulation of the McDonald's Order Management System
func runSimulation() {
	// Print simulation header
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	// Launch a goroutine to handle asynchronous output messages
	go func() {
		for msg := range outputChan {
			outputMutex.Lock()   // Lock the mutex to prevent concurrent writes
			fmt.Println(msg)     // Print the output message
			outputMutex.Unlock() // Release the mutex
		}
	}()

	// Small delay to ensure the goroutine is ready
	time.Sleep(100 * time.Millisecond)

	// Initialize the system with 0 bots
	fmt.Printf("[%s] System initialized with 0 bots\n", util.FormatTimestamp())

	// Create a normal order and print its details
	o1 := orderMgr.CreateOrder(order2.Normal)
	fmt.Printf("[%s] Created Normal Order #%d - Status: %s\n", util.FormatTimestamp(), o1.Id, o1.Status)
	time.Sleep(1 * time.Second)

	// Create a VIP order and print its details
	o2 := orderMgr.CreateOrder(order2.VIP)
	fmt.Printf("[%s] Created VIP Order #%d - Status: %s\n", util.FormatTimestamp(), o2.Id, o2.Status)
	time.Sleep(1 * time.Second)

	// Create another normal order and print its details
	o3 := orderMgr.CreateOrder(order2.Normal)
	fmt.Printf("[%s] Created Normal Order #%d - Status: %s\n", util.FormatTimestamp(), o3.Id, o3.Status)
	time.Sleep(1 * time.Second)

	// Add a bot to the system
	botMgr.AddBot()
	time.Sleep(1 * time.Second)

	// Add another bot to the system
	botMgr.AddBot()
	time.Sleep(11 * time.Second)

	// Create a VIP order and print its details
	o4 := orderMgr.CreateOrder(order2.VIP)
	fmt.Printf("[%s] Created VIP Order #%d - Status: %s\n", util.FormatTimestamp(), o4.Id, o4.Status)
	time.Sleep(1 * time.Second)

	// Remove the newest bot from the system
	botMgr.RemoveNewestBot()
	time.Sleep(2 * time.Second)

	// Remove another bot from the system
	botMgr.RemoveNewestBot()

	// Wait for any remaining operations to complete
	time.Sleep(2 * time.Second)

	// Print the final status of the system
	printFinalStatus()

	// Close the output channel to signal the end of simulation
	close(outputChan)
}

func printFinalStatus() {
	totalVIP, totalNormal, completedVIP, completedNormal, totalPending := orderMgr.GetStats()
	botCount := botMgr.GetBotCount()

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders: %d (%d VIP, %d Normal)\n", totalVIP+totalNormal, totalVIP, totalNormal)
	fmt.Printf("- Orders Completed: %d\n", completedVIP+completedNormal)
	fmt.Printf("- Active Bots: %d\n", botCount)
	fmt.Printf("- Pending Orders: %d\n", totalPending)
}
