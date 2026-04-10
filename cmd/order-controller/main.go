package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"feedme/internal/sim"
)

func main() {
	engine := sim.NewEngine(sim.RealClock{}, os.Stdout, 10*time.Second)
	fmt.Println("FeedMe Order Controller CLI")
	helper := "Commands: n (new normal) | v (new vip) | + (add bot) | - (destroy bot) | s (status) | demo | help | exit"
	fmt.Println(helper)

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		line := strings.TrimSpace(strings.ToLower(scanner.Text()))
		switch line {
		case "n":
			engine.NewOrder(sim.Normal)
		case "v":
			engine.NewOrder(sim.VIP)
		case "+":
			engine.AddBot()
		case "-":
			if !engine.RemoveNewestBot() {
				fmt.Println("No active bots to remove")
			}
		case "s":
			printStatus(engine.Snapshot())
		case "demo":
			runDemo(engine)
		case "help":
			fmt.Println(helper)
		case "exit", "quit":
			return
		case "":
		default:
			fmt.Println("Unknown command. Type 'help'.")
		}
	}
}

func runDemo(engine *sim.Engine) {
	engine.NewOrder(sim.Normal)
	engine.NewOrder(sim.VIP)
	engine.NewOrder(sim.Normal)
	engine.AddBot()
	engine.AddBot()
	time.Sleep(11 * time.Second)
	engine.NewOrder(sim.VIP)
	time.Sleep(11 * time.Second)
	engine.RemoveNewestBot()
	printStatus(engine.Snapshot())
}

func printStatus(s sim.Snapshot) {
	fmt.Println("\nBots:")
	fmt.Printf("%-8s %-12s %-14s\n", "BOT_ID", "STATE", "CURRENT_ORDER")
	for _, b := range s.Bots {
		current := "-"
		if b.CurrentOrder != 0 {
			current = fmt.Sprintf("%d", b.CurrentOrder)
		}
		fmt.Printf("%-8d %-12s %-14s\n", b.BotID, b.State, current)
	}

	fmt.Println("--------------------------------")
	fmt.Println("\nActive Tasks:")
	fmt.Printf("%-10s %-8s %-12s %-8s\n", "ORDER_ID", "TYPE", "STATUS", "BOT_ID")
	for _, t := range s.ActiveTasks {
		bot := "-"
		if t.BotID != 0 {
			bot = fmt.Sprintf("%d", t.BotID)
		}
		fmt.Printf("%-10d %-8s %-12s %-8s\n", t.OrderID, t.Type, t.Status, bot)
	}
	fmt.Println("--------------------------------")

	fmt.Println("\nCompleted Tasks:")
	fmt.Printf("%-10s %-8s %-12s\n", "ORDER_ID", "TYPE", "STATUS")
	for _, t := range s.CompletedTasks {
		fmt.Printf("%-10d %-8s %-12s\n", t.OrderID, t.Type, t.Status)
	}
}
