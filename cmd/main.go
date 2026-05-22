package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"se-take-home-assignment/code"
	"sync"
	"syscall"
	"time"
)

// Global state
var controller *code.Controller        // Central order and bot controller
var shutdownChan = make(chan struct{}) // Signal channel for graceful shutdown
var logFile *os.File                   // Output log file handle
var logMutex sync.Mutex                // Protects concurrent log writes

// Command line flags
var demoMode bool     // -demo: Run predefined demo sequence
var outputFile string // -output: Custom log file path

func main() {
	flag.BoolVar(&demoMode, "demo", false, "Run in demo mode with predefined commands")
	flag.StringVar(&outputFile, "output", "", "Output file path for logs (default: ../scripts/result.txt)")
	flag.Parse()

	initLogFile()
	controller = code.NewController(log)
	setupGracefulShutdown()

	if demoMode {
		runDemoMode()
		return
	}

	runInteractiveMode()
}

// runInteractiveMode starts an interactive CLI session where users can type commands.
func runInteractiveMode() {
	scanner := bufio.NewScanner(os.Stdin)

	log("McDonald's Order Management System - Simulation Started")
	log("System initialized with %d bots", len(controller.Bots))

	printHelp()

	for {
		// Check for shutdown signal
		select {
		case <-shutdownChan:
			gracefulShutdown()
			return
		default:
		}

		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}

		cmd := scanner.Text()
		processCommand(cmd)
		if cmd == "exit" {
			return
		}
	}
}

// runDemoMode executes a predefined sequence of commands to demonstrate functionality.
// Used for CI/CD testing and automated verification.
func runDemoMode() {
	log("McDonald's Order Management System - Demo Mode Started")
	log("System initialized with %d bots", len(controller.Bots))

	// Demo sequence that showcases all functionality
	commands := []struct {
		cmd   string
		delay time.Duration
	}{
		{"normal", 100 * time.Millisecond},
		{"vip", 100 * time.Millisecond},
		{"normal", 100 * time.Millisecond},
		{"addbot", 100 * time.Millisecond},
		{"addbot", 100 * time.Millisecond},
		{"status", 2 * time.Second},
		{"status", 12 * time.Second}, // Wait for orders to complete
		{"removebot", 100 * time.Millisecond},
		{"status", 100 * time.Millisecond},
		{"exit", 0},
	}

	for _, c := range commands {
		log("Command: %s", c.cmd)
		processCommand(c.cmd)
		if c.cmd == "exit" {
			return
		}
		time.Sleep(c.delay)
	}
}

// processCommand handles a single CLI command input.
func processCommand(cmd string) {
	switch cmd {
	case "normal":
		addNormalOrder()
	case "vip":
		addVIPOrder()
	case "addbot":
		controller.AddBot()
	case "removebot":
		controller.RemoveBot()
	case "status":
		printStatus()
	case "help":
		printHelp()
	case "exit":
		log("Exit command received")
		gracefulShutdown()
	default:
		if cmd != "" {
			fmt.Println("Unknown command. Type 'help' for available commands.")
		}
	}
}

// printHelp displays available commands to the user.
func printHelp() {
	fmt.Println("\nAvailable Commands:")
	fmt.Println("  normal    - Add a normal order")
	fmt.Println("  vip       - Add a VIP order")
	fmt.Println("  addbot    - Add a new cooking bot")
	fmt.Println("  removebot - Remove the newest cooking bot")
	fmt.Println("  status    - Show system status")
	fmt.Println("  help      - Show this help message")
	fmt.Println("  exit      - Shutdown the system")
	fmt.Println()
}

// setupGracefulShutdown listens for OS interrupt signals (Ctrl+C, SIGTERM)
// and triggers graceful shutdown when received.
func setupGracefulShutdown() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log("\nReceived shutdown signal")
		close(shutdownChan)
	}()
}

// gracefulShutdown stops all bots and closes resources cleanly.
func gracefulShutdown() {
	log("Initiating graceful shutdown...")
	controller.StopAllBots()
	time.Sleep(2 * time.Second) // Allow time for bots to return orders
	log("System shutdown complete")
	closeLogFile()
}

// closeLogFile safely closes the log file handle.
func closeLogFile() {
	logMutex.Lock()
	defer logMutex.Unlock()
	if logFile != nil {
		logFile.Sync()
		logFile.Close()
		logFile = nil
	}
}

// addNormalOrder creates a new normal priority order.
func addNormalOrder() {
	order, err := controller.NewOrder("NORMAL")
	if err != nil {
		log("Error creating order: %v", err)
		return
	}
	log("Created Normal Order #%d - Status: PENDING", order.ID)
}

// addVIPOrder creates a new VIP priority order.
func addVIPOrder() {
	order, err := controller.NewOrder("VIP")
	if err != nil {
		log("Error creating order: %v", err)
		return
	}
	log("Created VIP Order #%d - Status: PENDING", order.ID)
}

// printStatus displays the current system status in a formatted table.
func printStatus() {
	totalVIP, totalNormal, completed, pendingVIP, pendingNormal, activeBots := controller.GetStats()
	total := totalVIP + totalNormal
	pending := pendingVIP + pendingNormal

	fmt.Println("\n╔════════════════════════════════════════╗")
	fmt.Println("║     MCDONALD'S ORDER STATUS           ║")
	fmt.Println("╠════════════════════════════════════════╣")
	fmt.Printf("║ Total Orders Created:  %-20d ║\n", total)
	fmt.Printf("║   ├─ VIP Orders:        %-20d ║\n", totalVIP)
	fmt.Printf("║   └─ Normal Orders:     %-20d ║\n", totalNormal)
	fmt.Printf("║ Orders Completed:       %-20d ║\n", completed)
	fmt.Printf("║ Orders Pending:         %-20d ║\n", pending)
	fmt.Printf("║   ├─ VIP Queue:         %-20d ║\n", pendingVIP)
	fmt.Printf("║   └─ Normal Queue:      %-20d ║\n", pendingNormal)
	fmt.Printf("║ Active Bots:            %-20d ║\n", activeBots)
	if total > 0 {
		fmt.Printf("║ Completion Rate:        %-20.1f%% ║\n",
			float64(completed)/float64(total)*100)
	}
	fmt.Println("╚════════════════════════════════════════╝")
}

// initLogFile initializes the log file for output.
// It tries multiple paths: custom output flag, scripts directory, or fallback to current directory.
func initLogFile() {
	var logPath string

	// Use custom output path if provided
	if outputFile != "" {
		logPath = outputFile
	} else {
		// Try to find scripts directory relative to executable
		execPath, err := os.Executable()
		if err == nil {
			execDir := filepath.Dir(execPath)
			scriptsDir := filepath.Join(execDir, "..", "scripts")
			if _, err := os.Stat(scriptsDir); err == nil {
				logPath = filepath.Join(scriptsDir, "result.txt")
			}
		}

		// Fallback to relative path
		if logPath == "" {
			logPath = filepath.Join("..", "scripts", "result.txt")
		}
	}

	// Open log file (create or truncate)
	var err error
	logFile, err = os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		// Fallback to current directory
		logFile, err = os.OpenFile("result.txt", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not open log file: %v\n", err)
			logFile = nil
		}
	}
}

// log writes a timestamped message to both stdout and the log file.
func log(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	now := time.Now().Format("15:04:05")
	line := fmt.Sprintf("[%s] %s\n", now, msg)

	logMutex.Lock()
	defer logMutex.Unlock()

	fmt.Print(line)

	if logFile != nil {
		_, err := logFile.WriteString(line)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Failed to write to log file: %v\n", err)
		}
		logFile.Sync()
	}
}
