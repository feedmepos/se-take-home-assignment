package cli

import (
	"bufio"
	"fmt"
	"io"
	"mcdonalds-order-controller/application"
	"mcdonalds-order-controller/domain"
	"os"
	"strconv"
	"strings"
	"time"
)

type CLI struct {
	orderService *application.OrderService
	botService   *application.BotService
	scheduler    *domain.BotScheduler
	output       *os.File
}

func NewCLI(orderService *application.OrderService, botService *application.BotService, scheduler *domain.BotScheduler, output *os.File) *CLI {
	return &CLI{
		orderService: orderService,
		botService:   botService,
		scheduler:    scheduler,
		output:       output,
	}
}

func (c *CLI) Run() {
	reader := bufio.NewReader(os.Stdin)
	c.printWelcome()

	for {
		c.printPrompt()
		input, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				c.println("\nGoodbye!")
				return
			}
			c.println(fmt.Sprintf("Error reading input: %v", err))
			continue
		}

		input = strings.TrimSpace(input)
		if input == "" {
			continue
		}

		result := c.ExecuteCommand(input)
		if result != "" {
			c.println(result)
		}

		if input == "exit" || input == "quit" {
			return
		}
	}
}

func (c *CLI) ExecuteCommand(cmd string) string {
	cmd = strings.TrimSpace(cmd)
	parts := strings.Fields(cmd)
	if len(parts) == 0 {
		return ""
	}

	command := strings.ToLower(parts[0])

	switch command {
	case "new-normal":
		count := 1
		if len(parts) > 1 {
			var err error
			count, err = c.parseCount(parts[1])
			if err != nil {
				return c.timestamp() + " " + err.Error()
			}
		}
		result := c.handleNewNormal(count)
		return result + "\n" + c.handleStatus()
	case "new-vip":
		count := 1
		if len(parts) > 1 {
			var err error
			count, err = c.parseCount(parts[1])
			if err != nil {
				return c.timestamp() + " " + err.Error()
			}
		}
		result := c.handleNewVIP(count)
		return result + "\n" + c.handleStatus()
	case "+bot":
		count := 1
		if len(parts) > 1 {
			var err error
			count, err = c.parseCount(parts[1])
			if err != nil {
				return c.timestamp() + " " + err.Error()
			}
		}
		result := c.handleAddBot(count)
		return result + "\n" + c.handleStatus()
	case "-bot":
		count := 1
		if len(parts) > 1 {
			var err error
			count, err = c.parseCount(parts[1])
			if err != nil {
				return c.timestamp() + " " + err.Error()
			}
		}
		result := c.handleRemoveBot(count)
		return result + "\n" + c.handleStatus()
	case "status":
		return c.handleStatus()
	case "help":
		return c.handleHelp()
	case "exit", "quit":
		return "Goodbye!"
	default:
		return c.timestamp() + " Unknown command: " + command + ". Type 'help' for available commands."
	}
}

func (c *CLI) parseCount(countStr string) (int, error) {
	count, err := strconv.Atoi(countStr)
	if err != nil {
		return 0, fmt.Errorf("Invalid count: %s. Please specify a number between 1 and 10.", countStr)
	}
	if count < 1 || count > 10 {
		return 0, fmt.Errorf("Count must be between 1 and 10, got %d.", count)
	}
	return count, nil
}

func (c *CLI) handleNewNormal(count int) string {
	var sb strings.Builder
	for i := 0; i < count; i++ {
		order, err := c.orderService.CreateNormalOrder()
		if err != nil {
			return c.timestamp() + " Error creating normal order: " + err.Error()
		}
		sb.WriteString(c.timestamp() + fmt.Sprintf(" Created Normal Order #%d\n", order.ID))
	}
	return strings.TrimSpace(sb.String())
}

func (c *CLI) handleNewVIP(count int) string {
	var sb strings.Builder
	for i := 0; i < count; i++ {
		order, err := c.orderService.CreateVIPOrder()
		if err != nil {
			return c.timestamp() + " Error creating VIP order: " + err.Error()
		}
		sb.WriteString(c.timestamp() + fmt.Sprintf(" Created VIP Order #%d\n", order.ID))
	}
	return strings.TrimSpace(sb.String())
}

func (c *CLI) handleAddBot(count int) string {
	var sb strings.Builder
	for i := 0; i < count; i++ {
		bot := c.botService.AddBot()
		sb.WriteString(c.timestamp() + fmt.Sprintf(" Added Bot #%d\n", bot.ID))
	}
	return strings.TrimSpace(sb.String())
}

func (c *CLI) handleRemoveBot(count int) string {
	var sb strings.Builder
	for i := 0; i < count; i++ {
		bot, order := c.botService.RemoveBot()
		if bot == nil {
			sb.WriteString(c.timestamp() + " No bots to remove\n")
			break
		}
		if order != nil {
			sb.WriteString(c.timestamp() + fmt.Sprintf(" Removed Bot #%d (Order #%d returned to queue)\n", bot.ID, order.ID))
		} else {
			sb.WriteString(c.timestamp() + fmt.Sprintf(" Removed Bot #%d\n", bot.ID))
		}
	}
	return strings.TrimSpace(sb.String())
}

func (c *CLI) handleStatus() string {
	return c.printStatus()
}

func (c *CLI) handleHelp() string {
	var sb strings.Builder
	sb.WriteString(c.timestamp() + " Available commands:\n")
	sb.WriteString(c.timestamp() + "  new-normal [count]  - Create normal orders (1-10)\n")
	sb.WriteString(c.timestamp() + "  new-vip [count]     - Create VIP orders (1-10)\n")
	sb.WriteString(c.timestamp() + "  +bot [count]        - Add new bots (1-10)\n")
	sb.WriteString(c.timestamp() + "  -bot [count]        - Remove bots (1-10)\n")
	sb.WriteString(c.timestamp() + "  status              - Show current status\n")
	sb.WriteString(c.timestamp() + "  help                - Show this help message\n")
	sb.WriteString(c.timestamp() + "  exit/quit           - Exit the program")
	return sb.String()
}

func (c *CLI) printStatus() string {
	var sb strings.Builder

	sb.WriteString(c.timestamp() + " ===== Current Status =====\n")

	// Bot status
	botStatus := c.botService.GetBotStatus()
	sb.WriteString(c.timestamp() + fmt.Sprintf(" Bots: %d\n", len(botStatus)))
	for id, status := range botStatus {
		sb.WriteString(c.timestamp() + fmt.Sprintf("   Bot #%d: %s\n", id, status))
	}

	// Pending orders
	pendingOrders := c.orderService.GetPendingOrders()
	sb.WriteString(c.timestamp() + fmt.Sprintf(" Pending Orders: %d\n", len(pendingOrders)))
	for _, order := range pendingOrders {
		sb.WriteString(c.timestamp() + fmt.Sprintf("   Order #%d (%s)\n", order.ID, order.Type.String()))
	}

	// Complete orders
	completeOrders := c.orderService.GetCompleteOrders()
	sb.WriteString(c.timestamp() + fmt.Sprintf(" Complete Orders: %d\n", len(completeOrders)))
	for _, order := range completeOrders {
		sb.WriteString(c.timestamp() + fmt.Sprintf("   Order #%d (%s)\n", order.ID, order.Type.String()))
	}

	sb.WriteString(c.timestamp() + " ==========================")
	return sb.String()
}

func (c *CLI) printWelcome() {
	c.println(c.timestamp() + " Welcome to McDonald's Order Controller")
	c.println(c.timestamp() + " Type 'help' for available commands")
}

func (c *CLI) printPrompt() {
	c.output.WriteString("> ")
	c.output.Sync()
}

func (c *CLI) println(s string) {
	c.output.WriteString(s + "\n")
	c.output.Sync()
}

func (c *CLI) timestamp() string {
	return time.Now().Format("15:04:05")
}
