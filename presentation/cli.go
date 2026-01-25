package presentation

import (
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/usecases"
	"fmt"
	"time"
)

// OutputWriter defines the contract for writing simulation output.
// This interface is owned by the presentation layer since it's a presentation concern.
type OutputWriter interface {
	WriteLine(line string) error
	Flush() error
}

// CLIDependencies contains all dependencies needed by CLI.
// This struct is owned by the presentation layer.
type CLIDependencies struct {
	CreateOrderUC    *usecases.CreateOrderUseCase
	AddBotUC         *usecases.AddBotUseCase
	RemoveBotUC      *usecases.RemoveBotUseCase
	AssignOrdersUC   *usecases.AssignOrdersUseCase
	CompleteOrdersUC *usecases.CompleteOrdersUseCase
	GetStatusUC      *usecases.GetStatusUseCase
	Output           OutputWriter
}

type CLI struct {
	createOrderUC    *usecases.CreateOrderUseCase
	addBotUC         *usecases.AddBotUseCase
	removeBotUC      *usecases.RemoveBotUseCase
	assignOrdersUC   *usecases.AssignOrdersUseCase
	completeOrdersUC *usecases.CompleteOrdersUseCase
	getStatusUC      *usecases.GetStatusUseCase
	output           OutputWriter
	simTime          time.Time
}

func NewCLI(deps *CLIDependencies) *CLI {
	cli := &CLI{
		simTime: time.Now(),
	}
	if deps != nil {
		cli.createOrderUC = deps.CreateOrderUC
		cli.addBotUC = deps.AddBotUC
		cli.removeBotUC = deps.RemoveBotUC
		cli.assignOrdersUC = deps.AssignOrdersUC
		cli.completeOrdersUC = deps.CompleteOrdersUC
		cli.getStatusUC = deps.GetStatusUC
		cli.output = deps.Output
	}
	return cli
}

func (cli *CLI) timestamp() string {
	return cli.simTime.Format("15:04:05")
}

func (cli *CLI) advanceTime(seconds int) {
	cli.simTime = cli.simTime.Add(time.Duration(seconds) * time.Second)
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
	return nil
}

func (cli *CLI) CreateVIPOrder() error {
	result, err := cli.createOrderUC.Execute(usecases.CreateOrderArgs{
		OrderType: entities.OrderTypeVIP,
	})
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
		return err
	}
	cli.output.WriteLine(fmt.Sprintf("[%s] Created VIP Order #%d - Status: PENDING",
		cli.timestamp(), result.Order.ID))
	return nil
}

func (cli *CLI) AddBot() error {
	res, err := cli.addBotUC.Execute()
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
		return err
	}
	cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d created - Status: ACTIVE", cli.timestamp(), res.Bot.ID))
	return nil
}

func (cli *CLI) RemoveBot() error {
	result, err := cli.removeBotUC.Execute()
	if err != nil {
		cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
		return err
	}
	if result == nil {
		return nil
	}

	if result.WasProcessing {
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d destroyed while PROCESSING Order #%d", cli.timestamp(), result.BotID, result.OrderID))
		cli.output.WriteLine(fmt.Sprintf("[%s] Order #%d returned to PENDING queue", cli.timestamp(), result.OrderID))
	} else {
		cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d destroyed while IDLE", cli.timestamp(), result.BotID))
	}
	return nil
}

func (cli *CLI) hasIdleBot(status *usecases.GetStatusRes) bool {
	for _, bot := range status.Bots {
		if !bot.IsProcessing {
			return true
		}
	}
	return false
}

func (cli *CLI) ProcessPendingOrders() {
	for {
		status := cli.getStatusUC.Execute()
		if !cli.hasIdleBot(status) || len(status.PendingOrders) == 0 {
			break
		}

		assigned, err := cli.assignOrdersUC.Execute()
		if err != nil {
			cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
			return
		}
		if len(assigned) == 0 {
			break
		}

		for _, r := range assigned {
			cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING",
				cli.timestamp(), r.BotID, orderTypeString(r.Order.Type), r.Order.ID))
		}

		cli.advanceTime(10)

		completed, err := cli.completeOrdersUC.Execute(usecases.CompleteOrdersArgs{Assignments: assigned})
		if err != nil {
			cli.output.WriteLine(fmt.Sprintf("[ERROR] %v", err))
			return
		}
		for _, r := range completed {
			cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)",
				cli.timestamp(), r.BotID, orderTypeString(r.Order.Type), r.Order.ID))
		}
	}

	status := cli.getStatusUC.Execute()
	if len(status.PendingOrders) == 0 {
		for _, bot := range status.Bots {
			if !bot.IsProcessing {
				cli.output.WriteLine(fmt.Sprintf("[%s] Bot #%d is now IDLE - No pending orders", cli.timestamp(), bot.ID))
				break
			}
		}
	}
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

	cli.output.WriteLine("")
	cli.output.WriteLine("Final Status:")
	cli.output.WriteLine(fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)",
		len(status.CompleteOrders), vipCount, normalCount))
	cli.output.WriteLine(fmt.Sprintf("- Orders Completed: %d", len(status.CompleteOrders)))
	cli.output.WriteLine(fmt.Sprintf("- Active Bots: %d", len(status.Bots)))
	cli.output.WriteLine(fmt.Sprintf("- Pending Orders: %d", len(status.PendingOrders)))
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
