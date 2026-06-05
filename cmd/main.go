package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"feedmepos_homework/internal/controller"

	"github.com/urfave/cli/v2"
)

func main() {
	app := &cli.App{
		Name:  "order-controller",
		Usage: "McDonald's cooking bot order controller",
		Flags: []cli.Flag{
			&cli.BoolFlag{Name: "simulate", Usage: "run the automated CLI simulation"},
			&cli.BoolFlag{Name: "interactive", Usage: "run the interactive CLI"},
		},
		Action: func(ctx *cli.Context) error {
			if shouldRunInteractive(ctx.Bool("simulate"), ctx.Bool("interactive")) {
				runInteractiveCLI()
				return nil
			}
			runSimulation()
			return nil
		},
	}

	if err := app.Run(os.Args); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func shouldRunInteractive(simulate, interactive bool) bool {
	if simulate {
		return false
	}
	if interactive {
		return true
	}
	stat, err := os.Stdin.Stat()
	return err == nil && (stat.Mode()&os.ModeCharDevice) != 0
}

func runSimulation() {
	c := controller.NewController(os.Stdout)
	defer c.Stop()

	fmt.Println("McDonald's Order Management System - CLI Simulation")
	fmt.Printf("[%s] System initialized with 0 bots\n", time.Now().Format("15:04:05"))

	mockCommand(c)

	time.Sleep(20 * time.Second)
	printFinalStatus(c.Snapshot())
}

func runInteractiveCLI() {
	c := controller.NewController(os.Stdout)
	defer c.Stop()

	fmt.Println("McDonald's Order Management System - Interactive CLI")
	fmt.Println("Type help to list commands.")
	fmt.Printf("[%s] System initialized with 0 bots\n", time.Now().Format("15:04:05"))

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("\nMcDonald's CLI> ")
		if !scanner.Scan() {
			fmt.Println()
			return
		}
		if executeCLICommand(c, scanner.Text()) {
			return
		}
	}
}

func executeCLICommand(c *controller.Controller, input string) bool {
	cmd := strings.TrimSpace(strings.ToLower(input))
	switch cmd {
	case "":
		return false
	case "normal", "n", "new normal", "new normal order":
		c.NewOrder(controller.Normal)
	case "vip", "v", "new vip", "new vip order":
		c.NewOrder(controller.VIP)
	case "+", "+ bot", "add bot":
		c.AddBot()
	case "-", "- bot", "remove bot":
		c.RemoveBot()
	case "status", "s":
		printFinalStatus(c.Snapshot())
	case "help", "h":
		printHelp()
	case "exit", "quit", "q":
		fmt.Println("Shutting down McDonald's Order Management System.")
		return true
	default:
		fmt.Printf("Unknown command %q. Type help to list commands.\n", cmd)
	}
	return false
}

func printHelp() {
	fmt.Println("Available commands:")
	fmt.Println("  normal | n        Create a normal order")
	fmt.Println("  vip | v           Create a VIP order")
	fmt.Println("  + | add bot       Add a cooking bot")
	fmt.Println("  - | remove bot    Remove the newest cooking bot")
	fmt.Println("  status | s        Print current system status")
	fmt.Println("  help | h          Print this help")
	fmt.Println("  exit | q          Exit interactive CLI")
}

func mockCommand(c *controller.Controller) {
	c.NewOrder(controller.Normal)
	c.NewOrder(controller.Normal)
	c.NewOrder(controller.VIP)
	c.NewOrder(controller.Normal)

	time.Sleep(1 * time.Second)
	c.AddBot()

	time.Sleep(1 * time.Second)
	c.AddBot()

	// Wait for orders to complete (10+ seconds each)
	time.Sleep(12 * time.Second)
	c.NewOrder(controller.VIP)
	time.Sleep(1 * time.Second)

	c.RemoveBot()
}

func printFinalStatus(snapshot controller.Snapshot) {
	vipCompleted := 0
	normalCompleted := 0
	for _, order := range snapshot.Completed {
		if order.Type == controller.VIP {
			vipCompleted++
		} else {
			normalCompleted++
		}
	}

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", len(snapshot.Completed), vipCompleted, normalCompleted)
	fmt.Printf("- Orders Completed: %d\n", len(snapshot.Completed))
	fmt.Printf("- Active Bots: %d\n", len(snapshot.Bots))
	fmt.Printf("- Pending Orders: %d\n", len(snapshot.Pending))
}
