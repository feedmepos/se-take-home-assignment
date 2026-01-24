package presentation

import (
	"feedme-takehome/config"
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
	"feedme-takehome/domain/usecases"
	"fmt"
	"time"
)

type CLI struct {
	createOrderUC    *usecases.CreateOrderUseCase
	addBotUC         *usecases.AddBotUseCase
	removeBotUC      *usecases.RemoveBotUseCase
	processOrdersUC  *usecases.ProcessOrdersUseCase
	getStatusUC      *usecases.GetStatusUseCase
	output           interfaces.OutputWriter
	processingTicker *time.Ticker
	done             chan bool
}

// Compile-time interface check
var _ interfaces.OrderProcessingEventHandler = (*CLI)(nil)

func (cli *CLI) OnOrderPickedUp(botID int, order *entities.Order) {
	timestamp := time.Now().Format("15:04:05")
	orderType := "Normal"
	if order.Type == entities.OrderTypeVIP {
		orderType = "VIP"
	}
	cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING",
		timestamp, botID, orderType, order.ID))
}

func (cli *CLI) OnOrderCompleted(botID int, order *entities.Order) {
	timestamp := time.Now().Format("15:04:05")
	orderType := "Normal"
	if order.Type == entities.OrderTypeVIP {
		orderType = "VIP"
	}

	processingTime := "10s"
	if order.ProcessingStartedAt != nil && order.CompletedAt != nil {
		duration := order.CompletedAt.Sub(*order.ProcessingStartedAt)
		processingTime = fmt.Sprintf("%ds", int(duration.Seconds()))
	}

	cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %s)",
		timestamp, botID, orderType, order.ID, processingTime))

	// Check if bot is now idle
	pendingCount := len(cli.getStatusUC.Execute().PendingOrders)
	if pendingCount == 0 {
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d is now IDLE - No pending orders", timestamp, botID))
	}
}

func (cli *CLI) OnOrderInterrupted(orderID int) {
	timestamp := time.Now().Format("15:04:05")
	cli.output.WriteLine(fmt.Sprintf("[%s] Order #%d processing was interrupted - returned to PENDING",
		timestamp, orderID))
}

func NewCLI(deps *config.Dependencies) *CLI {
	cli := &CLI{
		done: make(chan bool),
	}
	if deps != nil {
		cli.SetDependencies(deps)
	}
	return cli
}

func (cli *CLI) SetDependencies(deps *config.Dependencies) {
	cli.createOrderUC = deps.CreateOrderUC
	cli.addBotUC = deps.AddBotUC
	cli.removeBotUC = deps.RemoveBotUC
	cli.processOrdersUC = deps.ProcessOrdersUC
	cli.getStatusUC = deps.GetStatusUC
	cli.output = deps.Output
}

func (cli *CLI) Start() {
	cli.processingTicker = time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-cli.processingTicker.C:
				cli.processOrdersUC.StartProcessing()
			case <-cli.done:
				return
			}
		}
	}()
}

func (cli *CLI) Stop() {
	if cli.processingTicker != nil {
		cli.processingTicker.Stop()
	}
	close(cli.done)
	cli.output.Flush()
}

func (cli *CLI) NewNormalOrder() {
	result, err := cli.createOrderUC.Execute(entities.OrderTypeNormal)
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] Error creating order: %v", err))
		return
	}

	timestamp := time.Now().Format("15:04:05")
	cli.output.WriteLine(fmt.Sprintf("[%s] Created Normal Order #%d - Status: PENDING",
		timestamp, result.Order.ID))

	cli.processOrdersUC.StartProcessing()
}

func (cli *CLI) NewVIPOrder() {
	result, err := cli.createOrderUC.Execute(entities.OrderTypeVIP)
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] Error creating order: %v", err))
		return
	}

	timestamp := time.Now().Format("15:04:05")
	cli.output.WriteLine(fmt.Sprintf("[%s] Created VIP Order #%d - Status: PENDING",
		timestamp, result.Order.ID))

	cli.processOrdersUC.StartProcessing()
}

func (cli *CLI) AddBot() {
	bot, _, err := cli.addBotUC.Execute()
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] Error adding bot: %v", err))
		return
	}

	timestamp := time.Now().Format("15:04:05")
	cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d created - Status: ACTIVE", timestamp, bot.ID))

	cli.processOrdersUC.StartProcessing()
}

func (cli *CLI) RemoveBot() {
	result, err := cli.removeBotUC.Execute()
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] Error removing bot: %v", err))
		return
	}

	if result == nil {
		return // No bots to remove
	}

	timestamp := time.Now().Format("15:04:05")

	if result.WasProcessing {
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d destroyed while PROCESSING Order #%d", timestamp, result.BotID, result.OrderID))
		cli.output.WriteLine(fmt.Sprintf("[%s] Order #%d returned to PENDING queue", timestamp, result.OrderID))
	} else {
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d destroyed while IDLE", timestamp, result.BotID))
	}
}

func (cli *CLI) PrintStatus() {
	status := cli.getStatusUC.Execute()

	// Count VIP and Normal orders
	vipCount := 0
	normalCount := 0
	for _, order := range status.CompleteOrders {
		if order.Type == entities.OrderTypeVIP {
			vipCount++
		} else {
			normalCount++
		}
	}

	cli.output.WriteLine("")
	cli.output.WriteLine("Final Status:")
	cli.output.WriteLine(fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)",
		len(status.CompleteOrders), vipCount, normalCount))
	cli.output.WriteLine(fmt.Sprintf("- Orders Completed: %d", len(status.CompleteOrders)))
	cli.output.WriteLine(fmt.Sprintf("- Active Bots: %d", len(status.Bots)))
	cli.output.WriteLine(fmt.Sprintf("- Pending Orders: %d", len(status.PendingOrders)))
}

// WaitForCompletion blocks until all bots are idle and no further orders can be processed.
// It returns when:
// - All bots are idle (not processing any orders) AND no pending orders remain, OR
// - There are pending orders but no bots exist to process them
func (cli *CLI) WaitForCompletion() {
	for {
		status := cli.getStatusUC.Execute()

		allBotsIdle := len(status.ProcessingOrders) == 0
		hasPendingOrders := len(status.PendingOrders) > 0
		hasBots := len(status.Bots) > 0

		// Exit conditions:
		// 1. All bots are idle and no pending orders
		// 2. There are pending orders but no bots to process them
		if allBotsIdle && !hasPendingOrders {
			return
		}
		if hasPendingOrders && !hasBots {
			return
		}

		// Still work in progress, wait and check again
		time.Sleep(500 * time.Millisecond)
	}
}
