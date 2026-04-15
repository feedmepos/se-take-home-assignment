package main

import (
	"bufio"
	"feedme/mcdonald"
	"fmt"
	"os"
	"strings"
)

func main() {
	mc := mcdonald.New()
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("===========================================")
	fmt.Println("   McDonald's Order Management System")
	fmt.Println("===========================================")
	fmt.Println()
	printMenu()

	for {
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		if input == "" {
			continue
		}

		switch input {
		case "1":
			mc.CreateOrder(mcdonald.NormalCustomer)
		case "2":
			mc.CreateOrder(mcdonald.VIPCustomer)
		case "3":
			mc.AddCookingBot()
		case "4":
			mc.RemoveCookingBot()
		case "5":
			printMenu()
		case "6":
			mc.SummaryResult()
			fmt.Println("Exiting... Goodbye!")
			return
		default:
			fmt.Println("Invalid command. Please try again.")
		}
		fmt.Println()
	}
}

func printMenu() {
	fmt.Println("Commands:")
	fmt.Println("  1 - Create Normal Order")
	fmt.Println("  2 - Create VIP Order")
	fmt.Println("  3 - Add Bot (+Bot)")
	fmt.Println("  4 - Remove Bot (-Bot)")
	fmt.Println("  5 - Show Menu")
	fmt.Println("  6 - Exit")
	fmt.Println()
}
