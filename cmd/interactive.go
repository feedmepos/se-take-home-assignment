package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"feedme-assignment/internal"
)

// runInteractive provides a menu-driven CLI for real-time interaction.
func runInteractive(log internal.Logger) {
	c := internal.NewController(log)
	scanner := bufio.NewScanner(os.Stdin)

	fmt.Println("=== McDonald's Order Controller — Interactive Mode ===")
	fmt.Println()

	for {
		fmt.Println("1) Add Normal Order")
		fmt.Println("2) Add VIP Order")
		fmt.Println("3) Add Bot")
		fmt.Println("4) Remove Bot")
		fmt.Println("5) View Status")
		fmt.Println("6) Exit")
		fmt.Println()
		fmt.Print("Choose an option: ")

		if !scanner.Scan() {
			break
		}

		choice := strings.TrimSpace(scanner.Text())
		fmt.Println()

		switch choice {
		case "1":
			c.AddOrder(internal.Normal)
		case "2":
			c.AddOrder(internal.VIP)
		case "3":
			c.AddBot()
		case "4":
			c.RemoveBot()
		case "5":
			c.Status()
		case "6":
			fmt.Println("Waiting for processing orders to complete...")
			c.Wait()
			c.FinalStatus()
			fmt.Println("Goodbye!")
			return
		default:
			fmt.Println("Invalid option. Please choose 1-6.")
		}
		fmt.Println()
	}
}
