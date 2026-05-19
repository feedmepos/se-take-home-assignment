package cli

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/dnisting/se-take-home-assignment/internal/controller"
	"github.com/dnisting/se-take-home-assignment/internal/models"
)

// RunInteractive starts the interactive CLI mode.
func RunInteractive(c *controller.Controller, logFunc models.LogFunc) {
	fmt.Println("\nMcDonald's Order Management System - Interactive CLI")
	logFunc("Interactive mode started - waiting for user input...")

	reader := bufio.NewReader(os.Stdin)

	for {
		// Display current status
		DisplayStatus(c)

		// Display menu
		DisplayMainMenu()

		choice, err := reader.ReadString('\n')
		if err != nil {
			fmt.Println("Error reading input:", err)
			continue
		}

		choice = strings.TrimSpace(choice)

		switch choice {
		case "1":
			handleAddOrder(reader, c, logFunc)
		case "2":
			handleAddBot(c, logFunc)
		case "3":
			handleRemoveBot(c, logFunc)
		case "4":
			handleExit(c, logFunc)
			return
		default:
			fmt.Println("Invalid option. Please select 1-4.")
		}

		// Small delay to let bot processing update
		time.Sleep(500 * time.Millisecond)
	}
}

// handleAddOrder processes adding a new order.
func handleAddOrder(reader *bufio.Reader, c *controller.Controller, logFunc models.LogFunc) {
	DisplayOrderTypePrompt()
	choice, _ := reader.ReadString('\n')
	choice = strings.TrimSpace(choice)

	switch choice {
	case "1":
		c.NewNormalOrder()
		DisplaySuccessMessage("Normal order added")
		logFunc("User added a Normal order")
	case "2":
		c.NewVIPOrder()
		DisplaySuccessMessage("VIP order added")
		logFunc("User added a VIP order")
	default:
		DisplayErrorMessage("Invalid order type. Please select 1 or 2.")
	}
}

// handleAddBot processes adding a new bot.
func handleAddBot(c *controller.Controller, logFunc models.LogFunc) {
	c.AddBot()
	DisplaySuccessMessage("New bot added and started processing")
	logFunc("User added a new bot")
}

// handleRemoveBot processes removing the newest bot.
func handleRemoveBot(c *controller.Controller, logFunc models.LogFunc) {
	_, _, activeBots, _, _, _ := c.GetStatus()
	if activeBots == 0 {
		DisplayErrorMessage("No bots to remove")
		return
	}
	c.RemoveBot()
	DisplaySuccessMessage("Bot removed")
	logFunc("User removed a bot")
}

// handleExit gracefully shuts down the system.
func handleExit(c *controller.Controller, logFunc models.LogFunc) {
	fmt.Println("\nShutting down system...")
	logFunc("Shutting down system...")
	c.Shutdown()

	// Final status
	DisplayFinalStatus(c)
	fmt.Println("\nGoodbye!")
	logFunc("Interactive mode ended")
}
