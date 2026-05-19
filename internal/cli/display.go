package cli

import (
	"fmt"
	"strings"

	"github.com/dnisting/se-take-home-assignment/internal/controller"
)

// DisplayStatus shows the current system state in a formatted box.
func DisplayStatus(c *controller.Controller) {
	total, completed, activeBots, pending, vipCount, normalCount := c.GetStatus()

	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("System Status")
	fmt.Println(strings.Repeat("=", 50))
	fmt.Printf("Total Orders Created: %d (VIP: %d, Normal: %d)\n", total, vipCount, normalCount)
	fmt.Printf("Orders Completed:     %d\n", completed)
	fmt.Printf("Pending Orders:       %d\n", pending)
	fmt.Printf("Active Bots:          %d\n", activeBots)
}

// DisplayMainMenu prints the main menu options.
func DisplayMainMenu() {
	fmt.Println("\n=== Main Menu ===")
	fmt.Println("1 - Add Order")
	fmt.Println("2 - Add Bot")
	fmt.Println("3 - Remove Bot")
	fmt.Println("4 - Exit")
	fmt.Print("\nSelect an option (1-4): ")
}

// DisplayFinalStatus shows the final system state on exit.
func DisplayFinalStatus(c *controller.Controller) {
	total, completed, activeBots, pending, vipCount, normalCount := c.GetStatus()
	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("Final Status")
	fmt.Println(strings.Repeat("=", 50))
	fmt.Printf("Total Orders Processed: %d (VIP: %d, Normal: %d)\n", total, vipCount, normalCount)
	fmt.Printf("Orders Completed:       %d\n", completed)
	fmt.Printf("Pending Orders:         %d\n", pending)
	fmt.Printf("Active Bots:            %d\n", activeBots)
}

// DisplayOrderTypePrompt shows the order type selection menu.
func DisplayOrderTypePrompt() {
	fmt.Print("\nSelect order type:\n  1 - Normal\n  2 - VIP\nChoice (1-2): ")
}

// DisplaySuccessMessage shows a success indicator.
func DisplaySuccessMessage(msg string) {
	fmt.Println("✓ " + msg)
}

// DisplayErrorMessage shows an error indicator.
func DisplayErrorMessage(msg string) {
	fmt.Println("✗ " + msg)
}
