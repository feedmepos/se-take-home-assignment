package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/restaurant"
)

func main() {
	controller := restaurant.NewController(os.Stdout, 100*time.Millisecond)
	defer controller.Close()

	if len(os.Args) > 1 && os.Args[1] == "--demo" {
		runDemo(controller)
		return
	}
	runInteractive(controller)
}

func runDemo(controller *restaurant.Controller) {
	submit(controller, restaurant.Command{Type: restaurant.CreateNormalOrder, AmountCents: 1299})
	submit(controller, restaurant.Command{Type: restaurant.CreateVIPOrder, AmountCents: 1599})
	submit(controller, restaurant.Command{Type: restaurant.CreateNormalOrder, AmountCents: 999})
	submit(controller, restaurant.Command{Type: restaurant.AddRobotCommand})
	submit(controller, restaurant.Command{Type: restaurant.AddRobotCommand})
	// submit(controller, restaurant.Command{Type: restaurant.CreateNormalOrder, AmountCents: 1299})
	// submit(controller, restaurant.Command{Type: restaurant.CreateVIPOrder, AmountCents: 1599})
	time.Sleep(time.Second)
	submit(controller, restaurant.Command{Type: restaurant.RemoveRobotCommand})
	submit(controller, restaurant.Command{Type: restaurant.RemoveRobotCommand})

	// Bot #1 completes the VIP order, then the returned normal order.
	time.Sleep(21 * time.Second)
	submit(controller, restaurant.Command{Type: restaurant.StatusCommand})
}

func runInteractive(controller *restaurant.Controller) {
	printCLI("Interactive mode. Commands: normal [cents], vip [cents], add-bot [name], remove-bot, status, help, quit")
	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Printf("[%s] > ", time.Now().Format("15:04:05"))
		if !scanner.Scan() {
			return
		}
		fields := strings.Fields(scanner.Text())
		if len(fields) == 0 {
			continue
		}
		switch fields[0] {
		case "normal", "vip":
			amount, err := parseAmount(fields)
			if err != nil {
				printCLI(err.Error())
				continue
			}
			commandType := restaurant.CreateNormalOrder
			if fields[0] == "vip" {
				commandType = restaurant.CreateVIPOrder
			}
			submit(controller, restaurant.Command{Type: commandType, AmountCents: amount})
		case "add-bot":
			submit(controller, restaurant.Command{Type: restaurant.AddRobotCommand, RobotName: strings.Join(fields[1:], " ")})
		case "remove-bot":
			submit(controller, restaurant.Command{Type: restaurant.RemoveRobotCommand})
		case "status":
			submit(controller, restaurant.Command{Type: restaurant.StatusCommand})
		case "help":
			printCLI("Commands: normal [cents], vip [cents], add-bot [name], remove-bot, status, help, quit")
		case "quit", "exit":
			printCLI("Goodbye")
			return
		default:
			printCLI("Unknown command. Type help for available commands.")
		}
	}
}

func submit(controller *restaurant.Controller, command restaurant.Command) {
	response := controller.Submit(context.Background(), command)
	if response.Err != nil {
		printCLI("Error: " + response.Err.Error())
	}
}

func parseAmount(fields []string) (int64, error) {
	if len(fields) == 1 {
		return 1000, nil
	}
	amount, err := strconv.ParseInt(fields[1], 10, 64)
	if err != nil || amount <= 0 {
		return 0, fmt.Errorf("amount must be a positive integer in cents")
	}
	return amount, nil
}

func printCLI(message string) {
	fmt.Printf("[%s] %s\n", time.Now().Format("15:04:05"), message)
}
