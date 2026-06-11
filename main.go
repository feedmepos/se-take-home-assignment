package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/feedmepos/se-take-home-assignment/controller"
)

func main() {
	demo := flag.Bool("demo", false, "Run scripted demo scenario and exit (for CI / result.txt generation)")
	tickSeconds := flag.Int("tick-seconds", 10, "Seconds each bot spends processing an order")
	flag.Parse()

	tick := time.Duration(*tickSeconds) * time.Second
	logger := func(msg string) {
		fmt.Printf("[%s] %s\n", time.Now().Format("15:04:05"), msg)
	}

	if *demo {
		runDemo(tick, logger)
		return
	}
	runInteractive(tick, logger)
}

func runDemo(tick time.Duration, log controller.LogFn) {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	c := controller.New(controller.Options{Tick: tick, Logger: log})
	log("System initialized with 0 bots")

	log("--- Phase 1: Create orders (priority test) ---")
	c.NewOrder(controller.OrderNormal)
	c.NewOrder(controller.OrderVIP)
	c.NewOrder(controller.OrderNormal)
	c.NewOrder(controller.OrderVIP)
	printQueue(c, log)

	log("--- Phase 2: Add 2 bots ---")
	c.AddBot()
	c.AddBot()

	time.Sleep(tick / 3)

	log("--- Phase 3: Remove newest bot mid-processing (order requeues) ---")
	c.RemoveNewestBot()
	printQueue(c, log)

	log("--- Phase 4: Add new bot (picks up requeued order) ---")
	c.AddBot()

	log("--- Phase 5: Wait for all orders to complete ---")
	if !c.WaitIdle(tick*5 + 5*time.Second) {
		log("WARN: timed out waiting for bots to become idle")
	}

	log("--- Phase 6: Cleanup ---")
	c.Shutdown()

	fmt.Println()
	fmt.Println("Final Status:")
	snap := c.Status()
	fmt.Printf("- Pending Orders: %d\n", len(snap.Pending))
	fmt.Printf("- Completed Orders: %d\n", len(snap.Completed))
	fmt.Printf("- Active Bots: %d\n", len(snap.Bots))
}

func printQueue(c *controller.Controller, log controller.LogFn) {
	snap := c.Status()
	if len(snap.Pending) == 0 {
		log("PENDING queue: (empty)")
		return
	}
	parts := make([]string, 0, len(snap.Pending))
	for _, o := range snap.Pending {
		parts = append(parts, fmt.Sprintf("%s#%d", o.Type, o.ID))
	}
	log("PENDING queue: [" + strings.Join(parts, ", ") + "]")
}

func runInteractive(tick time.Duration, log controller.LogFn) {
	c := controller.New(controller.Options{Tick: tick, Logger: log})
	log("System initialized - interactive mode (type 'help' for commands)")

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Print("> ")
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			fmt.Print("> ")
			continue
		}
		switch strings.ToLower(line) {
		case "n", "normal", "new normal":
			c.NewOrder(controller.OrderNormal)
		case "v", "vip", "new vip":
			c.NewOrder(controller.OrderVIP)
		case "+", "+bot", "add bot":
			c.AddBot()
		case "-", "-bot", "remove bot":
			if b := c.RemoveNewestBot(); b == nil {
				log("No bots to remove")
			}
		case "s", "status":
			printStatus(c)
		case "h", "help", "?":
			printHelp()
		case "q", "quit", "exit":
			c.Shutdown()
			fmt.Println("bye.")
			return
		default:
			fmt.Println("Unknown command. Type 'help' for commands.")
		}
		fmt.Print("> ")
	}
}

func printHelp() {
	fmt.Println("Commands:")
	fmt.Println("  n | normal       - new Normal order")
	fmt.Println("  v | vip          - new VIP order")
	fmt.Println("  + | +bot         - add a bot")
	fmt.Println("  - | -bot         - remove the newest bot")
	fmt.Println("  s | status       - show pending orders and bot states")
	fmt.Println("  h | help         - show this help")
	fmt.Println("  q | quit         - shutdown and exit")
}

func printStatus(c *controller.Controller) {
	snap := c.Status()
	fmt.Println("PENDING:")
	if len(snap.Pending) == 0 {
		fmt.Println("  (empty)")
	} else {
		for _, o := range snap.Pending {
			fmt.Printf("  - %s Order #%d\n", o.Type, o.ID)
		}
	}
	fmt.Println("COMPLETE:")
	if len(snap.Completed) == 0 {
		fmt.Println("  (empty)")
	} else {
		for _, o := range snap.Completed {
			fmt.Printf("  - %s Order #%d\n", o.Type, o.ID)
		}
	}
	fmt.Println("BOTS:")
	if len(snap.Bots) == 0 {
		fmt.Println("  (none)")
	} else {
		for _, b := range snap.Bots {
			if b.Status == controller.BotProcessing {
				fmt.Printf("  - Bot #%d: PROCESSING Order #%d\n", b.ID, b.OrderID)
			} else {
				fmt.Printf("  - Bot #%d: IDLE\n", b.ID)
			}
		}
	}
}
