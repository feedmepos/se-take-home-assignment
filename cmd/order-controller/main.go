package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"arllen133/se-take-home-assignment/internal/order"
)

func main() {
	c := order.NewController()

	// Capture interrupt signals for graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigCh
		c.Stop()
		os.Exit(0)
	}()

	defer c.Stop()

	// 1. If interactive argument is passed, run the interactive shell. Otherwise run the simulation.
	if len(os.Args) > 1 && os.Args[1] == "interactive" {
		RunInteractive(c)
	} else {
		RunSimulation(c)
	}
}

// RunInteractive runs the interactive command shell
func RunInteractive(c *order.Controller) {
	fmt.Println("=======================================")
	fmt.Println(" McDonald's Automated Bot Controller   ")
	fmt.Println(" Commands: normal, vip, +bot, -bot, status, help, exit")
	fmt.Println("=======================================")

	// Start reading interactive command-line input
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		cmd := strings.TrimSpace(strings.ToLower(scanner.Text()))

		switch cmd {
		case "normal":
			execute(c, order.CreateNormalOrder)
		case "vip":
			execute(c, order.CreateVIPOrder)
		case "+bot":
			execute(c, order.AddBotCommand)
		case "-bot":
			execute(c, order.RemoveBotCommand)
		case "status":
			execute(c, order.StatusCommand)
		case "help":
			printHelp()
		case "exit":
			fmt.Println("Shutting down safely...")
			return
		default:
			if cmd != "" {
				fmt.Println("Unknown command. Please use 'help' to see all available commands.")
			}
		}
	}

	// Handle EOF (e.g. when input ends via pipe in CI scripts)
	if err := scanner.Err(); err != nil {
		fmt.Printf("Error reading input: %v\n", err)
	}
}

func printHelp() {
	fmt.Println("\nAvailable Commands:")
	fmt.Println("  normal - Create a new Normal order (status will be PENDING)")
	fmt.Println("  vip    - Create a new VIP order (placed in front of Normal orders)")
	fmt.Println("  +bot   - Spawn a new cooking bot to process pending orders (takes 10s)")
	fmt.Println("  -bot   - Destroy the newest cooking bot (releasing its order back to queue)")
	fmt.Println("  status - Print current statistics (active bots, pending/completed orders)")
	fmt.Println("  help   - Show this list of available commands")
	fmt.Println("  exit   - Show down the system safely and exit the shell")
	fmt.Println()
}

// execute is a helper to run commands and print errors if any
func execute(c *order.Controller, cmdType order.CommandType) {
	resp := c.Send(context.Background(), order.Command{Type: cmdType})
	if resp.Err != nil {
		fmt.Printf("Command failed: %v\n", resp.Err)
	}
}

// RunSimulation runs the simulation strictly adhering to the 10-second processing time per order
func RunSimulation(c *order.Controller) {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()
	ctx := context.Background()

	// [T+0s] 13:25:10
	c.Send(ctx, order.Command{Type: order.CreateNormalOrder}) // Generates 1001
	time.Sleep(1 * time.Second)

	// [T+1s] 13:25:11
	c.Send(ctx, order.Command{Type: order.CreateVIPOrder})    // Generates 1002
	c.Send(ctx, order.Command{Type: order.CreateNormalOrder}) // Generates 1003
	time.Sleep(1 * time.Second)

	// [T+2s] 13:25:12
	c.Send(ctx, order.Command{Type: order.AddBotCommand}) // Bot #1 created, picks up highest-priority VIP #1002 (completes at T+12s)
	time.Sleep(1 * time.Second)

	// [T+3s] 13:25:13
	c.Send(ctx, order.Command{Type: order.AddBotCommand}) // Bot #2 created, picks up remaining Normal #1001 (completes at T+13s)

	// ----------------------------------------------------
	// Wait 11 seconds to reach T+14s
	// During this time:
	// - At T+12s, Bot #1 completes VIP #1002 and picks up Normal #1003
	// - At T+13s, Bot #2 completes Normal #1001 and becomes IDLE
	// ----------------------------------------------------
	time.Sleep(11 * time.Second)

	// [T+14s] 13:25:24
	c.Send(ctx, order.Command{Type: order.CreateVIPOrder}) // Generates 1004 (IDLE Bot #2 picks up immediately, completes at T+24s)

	// ----------------------------------------------------
	// Wait 10 seconds to reach T+24s
	// During this time:
	// - At T+22s, Bot #1 completes Normal #1003 and becomes IDLE
	// - At T+24s, Bot #2 completes VIP #1004 and becomes IDLE
	// ----------------------------------------------------
	time.Sleep(10 * time.Second)

	// Wait a tiny bit to make sure Bot #2 IDLE event is logged
	time.Sleep(100 * time.Millisecond)

	// [T+24s] 13:25:34
	// Destroy Bot #2 which just finished and became IDLE
	c.Send(ctx, order.Command{Type: order.RemoveBotCommand})

	// [T+25s] 13:25:35
	time.Sleep(1 * time.Second)
	c.PrintFinalStats() // Print final report
}
