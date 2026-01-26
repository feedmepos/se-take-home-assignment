package presentation

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/usecases"
	"feedme-takehome/services"
	"fmt"
	"time"
)

// OutputWriter defines the contract for writing output.
type OutputWriter interface {
	WriteLine(line string) error
	Flush() error
}

// CLIDependencies contains all dependencies needed by CLI.
type CLIDependencies struct {
	CreateOrderUC     *usecases.CreateOrderUseCase
	AddBotUC          *usecases.AddBotUseCase
	RemoveBotUC       *usecases.RemoveBotUseCase
	GetStatusUC       *usecases.GetStatusUseCase
	ProcessingService *services.ProcessingService
	Output            OutputWriter
}

type CLI struct {
	createOrderUC     *usecases.CreateOrderUseCase
	addBotUC          *usecases.AddBotUseCase
	removeBotUC       *usecases.RemoveBotUseCase
	getStatusUC       *usecases.GetStatusUseCase
	processingService *services.ProcessingService
	output            OutputWriter
}

func NewCLI(deps *CLIDependencies) *CLI {
	cli := &CLI{}
	if deps != nil {
		cli.createOrderUC = deps.CreateOrderUC
		cli.addBotUC = deps.AddBotUC
		cli.removeBotUC = deps.RemoveBotUC
		cli.getStatusUC = deps.GetStatusUC
		cli.processingService = deps.ProcessingService
		cli.output = deps.Output
	}
	return cli
}

// HandleProcessingEvent handles events from the processing service and displays them
func (cli *CLI) HandleProcessingEvent(event services.ProcessingEvent) {
	switch event.Type {
	case services.EventOrderPickedUp:
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING",
			cli.timestamp(), event.BotID, orderTypeString(event.Order.Type), event.Order.ID))
	case services.EventOrderCompleted:
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)",
			cli.timestamp(), event.BotID, orderTypeString(event.Order.Type), event.Order.ID))
	case services.EventBotIdle:
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d is now IDLE - No pending orders", cli.timestamp(), event.BotID))
	case services.EventError:
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %s", event.Message))
	}
}

func (cli *CLI) timestamp() string {
	return time.Now().Format("15:04:05")
}

func orderTypeString(orderType entities.OrderType) string {
	if orderType == entities.OrderTypeVIP {
		return "VIP"
	}
	return "Normal"
}

func (cli *CLI) PrintHeader() {
	cli.output.WriteLine("McDonald's Order Management System - Simulation Results")
	cli.output.WriteLine("")
	cli.output.WriteLine(fmt.Sprintf("[%s] System initialized with 0 bots", cli.timestamp()))
}

func (cli *CLI) PrintFooter() {
	cli.PrintStatus()
}

func (cli *CLI) PrintSection(title string) {
	cli.output.WriteLine("")
	cli.output.WriteLine(fmt.Sprintf("--- %s ---", title))
}

func (cli *CLI) PrintSeparator() {
	cli.output.WriteLine("")
	cli.output.WriteLine("----------------------------------------")
}

func (cli *CLI) Flush() {
	cli.output.Flush()
}

func (cli *CLI) CreateNormalOrder() error {
	result, err := cli.createOrderUC.Execute(usecases.CreateOrderArgs{
		OrderType: entities.OrderTypeNormal,
	})
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
		return err
	}
	cli.output.WriteLine(fmt.Sprintf("[%s] Created Normal Order #%d - Status: PENDING",
		cli.timestamp(), result.Order.ID))

	// Trigger background processing to pick up the order
	if cli.processingService != nil {
		cli.processingService.TriggerProcessing()
	}
	return nil
}

func (cli *CLI) CreateVIPOrder() error {
	// Check for pending normal orders before creating VIP order
	status := cli.getStatusUC.Execute()
	pendingNormalCount := 0
	for _, order := range status.PendingOrders {
		if order.Type == entities.OrderTypeNormal {
			pendingNormalCount++
		}
	}

	result, err := cli.createOrderUC.Execute(usecases.CreateOrderArgs{
		OrderType: entities.OrderTypeVIP,
	})
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
		return err
	}
	cli.output.WriteLine(fmt.Sprintf("[%s] Created VIP Order #%d - Status: PENDING",
		cli.timestamp(), result.Order.ID))

	// If there were pending normal orders, print reprioritization message
	if pendingNormalCount > 0 {
		cli.output.WriteLine(fmt.Sprintf("[%s] Queue reprioritized - VIP Order #%d moved ahead of %d normal order(s)",
			cli.timestamp(), result.Order.ID, pendingNormalCount))
	}

	// Trigger background processing to pick up the order
	if cli.processingService != nil {
		cli.processingService.TriggerProcessing()
	}
	return nil
}

func (cli *CLI) AddBot() error {
	res, err := cli.addBotUC.Execute()
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
		return err
	}
	cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d created - Status: ACTIVE", cli.timestamp(), res.Bot.ID))

	// Trigger background processing in case there are pending orders
	if cli.processingService != nil {
		cli.processingService.TriggerProcessing()
	}
	return nil
}

func (cli *CLI) RemoveBot() error {
	// First, check if the bot being removed is processing an order
	bots := cli.getStatusUC.Execute().Bots
	if len(bots) == 0 {
		cli.output.WriteLine(fmt.Sprintf("[%s] No bots available to remove", cli.timestamp()))
		return nil
	}

	// Find the newest bot (the one that will be removed)
	var newestBot *usecases.BotInfo
	for _, bot := range bots {
		if newestBot == nil || bot.ID > newestBot.ID {
			newestBot = bot
		}
	}

	// Cancel processing if the bot was processing
	if cli.processingService != nil && newestBot.IsProcessing {
		cli.processingService.CancelBotProcessing(newestBot.ID)
	}

	result, err := cli.removeBotUC.Execute()
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
		return err
	}
	if result == nil {
		cli.output.WriteLine(fmt.Sprintf("[%s] No bots available to remove", cli.timestamp()))
		return nil
	}

	if result.WasProcessing {
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d destroyed while PROCESSING Order #%d", cli.timestamp(), result.BotID, result.OrderID))
		cli.output.WriteLine(fmt.Sprintf("[%s] Order #%d returned to PENDING queue", cli.timestamp(), result.OrderID))
		// Trigger processing so another bot can pick up the order
		if cli.processingService != nil {
			cli.processingService.TriggerProcessing()
		}
	} else {
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d destroyed while IDLE", cli.timestamp(), result.BotID))
	}
	return nil
}

// GetProcessingStats returns the processing statistics from the processing service
func (cli *CLI) GetProcessingStats() (completed, vip, normal int) {
	if cli.processingService != nil {
		return cli.processingService.GetStats()
	}
	return 0, 0, 0
}

func (cli *CLI) PrintStatus() {
	status := cli.getStatusUC.Execute()

	vipCount := 0
	normalCount := 0
	for _, order := range status.CompleteOrders {
		if order.Type == entities.OrderTypeVIP {
			vipCount++
		} else {
			normalCount++
		}
	}

	// Count pending orders (pending + processing)
	pendingCount := len(status.PendingOrders) + len(status.ProcessingOrders)

	cli.output.WriteLine("")
	cli.output.WriteLine("Final Status:")
	cli.output.WriteLine(fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)",
		len(status.CompleteOrders), vipCount, normalCount))
	cli.output.WriteLine(fmt.Sprintf("- Orders Completed: %d", len(status.CompleteOrders)))
	cli.output.WriteLine(fmt.Sprintf("- Active Bots: %d", len(status.Bots)))
	cli.output.WriteLine(fmt.Sprintf("- Pending Orders: %d", pendingCount))
}

func (cli *CLI) PrintPendingQueue() {
	status := cli.getStatusUC.Execute()

	cli.output.WriteLine("")
	cli.output.WriteLine("Current Pending Queue:")
	if len(status.PendingOrders) == 0 {
		cli.output.WriteLine("  (empty)")
	} else {
		for i, order := range status.PendingOrders {
			cli.output.WriteLine(fmt.Sprintf("  %d. %s Order #%d", i+1, orderTypeString(order.Type), order.ID))
		}
	}
	cli.output.WriteLine("")
}
