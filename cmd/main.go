package main

import (
	"bufio"
	"fmt"
	"os"
	"se-take-home-assignment/order"
	"strconv"
	"strings"
	"time"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--demo" {
		fmt.Println("McDonald's Order Management System - Simulation Results")
		fmt.Println("")

		controller := order.NewOrderController(func(format string, args ...interface{}) {
			fmt.Printf(format+"\n", args...)
		})

		runDemo(controller)
		controller.PrintFinalStatus()
		return
	}

	controller := order.NewOrderController(func(format string, args ...interface{}) {
		fmt.Printf(format+"\n", args...)
	})

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Println("Welcome to McDonald's Order Controller!")
	fmt.Println("Please select an option by entering the number:")
	fmt.Println("  1. Add a new normal order")
	fmt.Println("  2. Add a new VIP order")
	fmt.Println("  3. Add a new cooking bot")
	fmt.Println("  4. Remove the newest bot")
	fmt.Println("  5. Show current status")
	fmt.Println("  6. Run a demo sequence")
	fmt.Println("  7. Exit the program")
	fmt.Println()

	for {
		fmt.Print("Enter your choice (1-7): ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())
		choice, err := strconv.Atoi(input)
		if err != nil {
			fmt.Println("Invalid input. Please enter a number between 1 and 7.")
			continue
		}

		switch choice {
		case 1:
			controller.AddNormalOrder()
		case 2:
			controller.AddVIPOrder()
		case 3:
			controller.AddBot()
		case 4:
			controller.RemoveBot()
		case 5:
			controller.PrintStatus()
		case 6:
			runDemo(controller)
			controller.PrintFinalStatus()
		case 7:
			fmt.Println("Goodbye!")
			return
		default:
			fmt.Println("Invalid choice. Please enter a number between 1 and 7.")
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Error reading input: %v\n", err)
	}
}

func runDemo(controller *order.OrderController) {
	controller.AddBot()
	time.Sleep(100 * time.Millisecond)
	controller.AddNormalOrder()
	time.Sleep(100 * time.Millisecond)
	controller.AddVIPOrder()
	time.Sleep(100 * time.Millisecond)
	controller.AddNormalOrder()
	time.Sleep(100 * time.Millisecond)
	controller.AddNormalOrder()
	time.Sleep(100 * time.Millisecond)
	controller.AddBot()
	time.Sleep(100 * time.Millisecond)
	controller.AddVIPOrder()
	time.Sleep(35 * time.Second)
	controller.RemoveBot()
}
