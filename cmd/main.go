package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/se-take-home-assignment/internal/controller"
	"github.com/se-take-home-assignment/internal/model"
	"github.com/se-take-home-assignment/internal/web"
)

func main() {
	demo := flag.Bool("demo", false, "Run a pre-defined demo scenario for CI")
	webMode := flag.Bool("web", false, "Start HTTP server with web UI on :18080")
	port := flag.String("port", "18080", "Port for web server")
	flag.Parse()

	ctrl := controller.New(os.Stdout)

	switch {
	case *demo:
		runDemo(ctrl)
	case *webMode:
		srv := web.New(ctrl)
		if err := srv.Start(":" + *port); err != nil {
			fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
			os.Exit(1)
		}
	default:
		runInteractive(ctrl)
	}
}

// runInteractive reads commands from stdin in a loop.
func runInteractive(ctrl *controller.Controller) {
	scanner := bufio.NewScanner(os.Stdin)

	printHelp()
	fmt.Print("> ")

	for scanner.Scan() {
		input := strings.TrimSpace(scanner.Text())
		switch input {
		case "1":
			ctrl.NewOrder(model.Normal)
		case "2":
			ctrl.NewOrder(model.VIP)
		case "+":
			ctrl.AddBot()
		case "-":
			ctrl.RemoveBot()
		case "s":
			printStatus(ctrl)
		case "q":
			fmt.Println("Goodbye!")
			return
		case "h", "help":
			printHelp()
		default:
			fmt.Printf("Unknown command: %q. Type 'h' for help.\n", input)
		}
		fmt.Print("> ")
	}
}

// printHelp displays available commands.
func printHelp() {
	fmt.Println("=== McDonald's Order Controller ===")
	fmt.Println("Commands:")
	fmt.Println("  1  - New Normal Order")
	fmt.Println("  2  - New VIP Order")
	fmt.Println("  +  - Add Bot")
	fmt.Println("  -  - Remove Bot")
	fmt.Println("  s  - Show Status")
	fmt.Println("  h  - Help")
	fmt.Println("  q  - Quit")
	fmt.Println("====================================")
}

// printStatus displays the current state of the system.
func printStatus(ctrl *controller.Controller) {
	fmt.Println("--- Status ---")
	fmt.Printf("Bots: %d\n", ctrl.BotCount())

	pending := ctrl.PendingOrders()
	fmt.Printf("PENDING (%d): ", len(pending))
	for i, o := range pending {
		if i > 0 {
			fmt.Print(", ")
		}
		fmt.Print(o)
	}
	fmt.Println()

	processing := ctrl.ProcessingOrders()
	fmt.Printf("PROCESSING (%d): ", len(processing))
	for i, o := range processing {
		if i > 0 {
			fmt.Print(", ")
		}
		fmt.Print(o)
	}
	fmt.Println()

	completed := ctrl.CompletedOrders()
	fmt.Printf("COMPLETE (%d): ", len(completed))
	for i, o := range completed {
		if i > 0 {
			fmt.Print(", ")
		}
		fmt.Print(o)
	}
	fmt.Println()
	fmt.Println("--------------")
}

// runDemo executes a pre-defined scenario to demonstrate all features.
// This is used by the CI pipeline to generate result.txt.
func runDemo(ctrl *controller.Controller) {
	fmt.Println("=== McDonald's Order Controller - Demo Mode ===")
	fmt.Println()

	// Step 1: Add some orders
	fmt.Println("--- Adding orders ---")
	ctrl.NewOrder(model.Normal) // Order #1
	ctrl.NewOrder(model.Normal) // Order #2
	ctrl.NewOrder(model.VIP)    // Order #3 - should be ahead of Normal orders
	ctrl.NewOrder(model.Normal) // Order #4
	ctrl.NewOrder(model.VIP)    // Order #5 - should be behind Order #3 but ahead of Normal

	fmt.Println()
	printStatus(ctrl)
	fmt.Println()

	// Step 2: Add a bot - should start processing Order #3 (first VIP)
	fmt.Println("--- Adding Bot 1 ---")
	ctrl.AddBot()

	// Step 3: Add another bot - should start processing Order #5 (second VIP)
	fmt.Println("--- Adding Bot 2 ---")
	ctrl.AddBot()

	fmt.Println()
	printStatus(ctrl)
	fmt.Println()

	// Step 4: Wait for the first two orders to complete (10 seconds)
	fmt.Println("--- Waiting 10 seconds for orders to complete ---")
	time.Sleep(11 * time.Second)

	fmt.Println()
	printStatus(ctrl)
	fmt.Println()

	// Step 5: Remove the newest bot while it's processing
	fmt.Println("--- Removing Bot 2 (should return its order to PENDING) ---")
	ctrl.RemoveBot()

	fmt.Println()
	printStatus(ctrl)
	fmt.Println()

	// Step 6: Wait for remaining orders to finish
	fmt.Println("--- Waiting for Bot 1 to complete remaining orders ---")
	time.Sleep(11 * time.Second)

	fmt.Println()
	printStatus(ctrl)
	fmt.Println()

	// Step 7: Wait for the next order
	fmt.Println("--- Waiting for next order to complete ---")
	time.Sleep(11 * time.Second)

	fmt.Println()
	printStatus(ctrl)
	fmt.Println()

	// Step 8: Wait for the last order
	fmt.Println("--- Waiting for last order to complete ---")
	time.Sleep(11 * time.Second)

	fmt.Println()
	fmt.Println("--- Final Status ---")
	printStatus(ctrl)

	fmt.Println()
	fmt.Println("=== Demo Complete ===")
}
