package main

import (
	"bufio"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"McDonald/internal/output"
	"McDonald/internal/system"
)

func main() {
	// Initialize output writer
	writer, err := output.NewWriter("result.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create result.txt: %v\n", err)
		os.Exit(1)
	}
	defer writer.Close()

	// Initialize system state
	state := system.NewSystemState(writer)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	fmt.Println("=== McDonald Order Management System ===")
	fmt.Println("Commands: normal, vip, add-bot, remove-bot, status, exit")
	fmt.Println()

	// Start scanner for interactive input
	scanner := bufio.NewScanner(os.Stdin)

	// If running with piped input, process it
	if fileInfo, _ := os.Stdin.Stat(); (fileInfo.Mode()&os.ModeCharDevice) == 0 {
		// Input is piped, process all lines
		for scanner.Scan() {
			cmd := strings.TrimSpace(scanner.Text())
			processCommand(cmd, state)
		}
		return
	}

	// Interactive mode
	go func() {
		<-sigChan
		fmt.Println("\nGoodbye!")
		os.Exit(0)
	}()

	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}

		cmd := strings.TrimSpace(scanner.Text())
		if cmd == "" {
			continue
		}

		if cmd == "exit" || cmd == "quit" || cmd == "q" {
			fmt.Println("Goodbye!")
			break
		}

		processCommand(cmd, state)
	}
}

func processCommand(cmd string, state *system.SystemState) {
	switch cmd {
	case "normal":
		state.CreateOrder(0) // OrderTypeNormal = 0
	case "vip":
		state.CreateOrder(1) // OrderTypeVIP = 1
	case "add-bot", "addbot", "+bot", "+":
		state.AddBot()
	case "remove-bot", "removebot", "-bot", "-":
		state.RemoveBot()
	case "status", "stat", "s":
		state.PrintStatus()
	case "help", "h", "?":
		printHelp()
	case "exit", "quit", "q":
		fmt.Println("Goodbye!")
		os.Exit(0)
	default:
		fmt.Printf("Unknown command: %s\n", cmd)
		printHelp()
	}
}

func printHelp() {
	fmt.Println("Available commands:")
	fmt.Println("  normal      - Create a normal order")
	fmt.Println("  vip         - Create a VIP order")
	fmt.Println("  add-bot     - Add a new cooking bot (+)")
	fmt.Println("  remove-bot  - Remove the newest bot (-)")
	fmt.Println("  status      - Show system status")
	fmt.Println("  exit        - Exit the program")
}
