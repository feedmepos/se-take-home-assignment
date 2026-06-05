package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/controller"
	"github.com/feedmepos/se-take-home-assignment/internal/simulation"
)

func main() {
	ctrl := controller.New()

	if len(os.Args) > 1 && os.Args[1] == "--simulate" {
		simulation.Run(ctrl)
		return
	}

	runInteractive(ctrl)
}

func runInteractive(ctrl *controller.Controller) {
	fmt.Println("McDonald's Order Controller (type 'help' for commands)")

	// Background goroutine reports order completions
	go func() {
		lastCount := 0
		for {
			time.Sleep(500 * time.Millisecond)
			current := ctrl.CompletedCount()
			if current > lastCount {
				fmt.Printf("[%s] %d order(s) completed\n", time.Now().Format("15:04:05"), current-lastCount)
				lastCount = current
			}
		}
	}()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		cmd := parts[0]

		switch cmd {
		case "normal", "n":
			o := ctrl.AddNormalOrder()
			fmt.Printf("[%s] Normal Order #%d added → PENDING\n", time.Now().Format("15:04:05"), o.ID)

		case "vip", "v":
			o := ctrl.AddVIPOrder()
			fmt.Printf("[%s] VIP Order #%d added → PENDING\n", time.Now().Format("15:04:05"), o.ID)

		case "+bot", "bot+", "addbot":
			b := ctrl.AddBot()
			fmt.Printf("[%s] Bot #%d created\n", time.Now().Format("15:04:05"), b.ID)

		case "-bot", "bot-", "removebot":
			b := ctrl.RemoveBot()
			if b == nil {
				fmt.Println("No bots to remove")
			} else {
				fmt.Printf("[%s] Bot #%d removed\n", time.Now().Format("15:04:05"), b.ID)
			}

		case "status", "s":
			fmt.Println(ctrl.Status())

		case "help", "h":
			fmt.Println("Commands:")
			fmt.Println("  normal / n       — Add a normal order")
			fmt.Println("  vip / v          — Add a VIP order")
			fmt.Println("  +bot / addbot    — Add a cooking bot")
			fmt.Println("  -bot / removebot — Remove the newest bot")
			fmt.Println("  status / s       — Show current state")
			fmt.Println("  help / h         — Show this help")
			fmt.Println("  exit / quit / q  — Exit")

		case "exit", "quit", "q":
			fmt.Println("Goodbye!")
			return

		default:
			fmt.Printf("Unknown command: %s (type 'help' for commands)\n", cmd)
		}
	}
}
