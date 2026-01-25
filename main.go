package main

import (
	"feedme-takehome/config"
	"feedme-takehome/data/repositories"
	"feedme-takehome/presentation"
	"feedme-takehome/simulation"
	"feedme-takehome/utils"
)

func main() {
	// Infrastructure layer
	orderRepo := repositories.NewInMemoryOrderRepository()
	botRepo := repositories.NewInMemoryBotRepository()
	output, err := utils.NewFileOutputWriter("scripts/result.txt")
	if err != nil {
		panic(err)
	}
	defer output.Flush()

	// Domain layer - use cases
	deps := config.InitializeDependencies(orderRepo, botRepo)

	// Presentation layer - CLI with its dependencies
	cli := presentation.NewCLI(&presentation.CLIDependencies{
		CreateOrderUC:    deps.CreateOrderUC,
		AddBotUC:         deps.AddBotUC,
		RemoveBotUC:      deps.RemoveBotUC,
		AssignOrdersUC:   deps.AssignOrdersUC,
		CompleteOrdersUC: deps.CompleteOrdersUC,
		GetStatusUC:      deps.GetStatusUC,
		Output:           output,
	})

	cli.PrintHeader()

	cli.PrintSection("Test 1: Basic Order Flow")
	simulation.BasicOrderFlow(cli)
	cli.PrintStatus()
	cli.PrintSeparator()

	cli.PrintSection("Test 2: VIP Priority")
	simulation.VIPPriority(cli)
	cli.PrintStatus()
	cli.PrintSeparator()

	cli.PrintSection("Test 3: Bot Removal")
	simulation.BotRemovalMidProcessing(cli)
	cli.PrintStatus()
	cli.PrintSeparator()

	cli.PrintSection("Test 4: Multiple VIP Orders Queue Correctly")
	cli.PrintPendingQueue()
	simulation.MultipleVIPOrdering(cli)
	cli.PrintStatus()
	cli.PrintSeparator()

	cli.PrintSection("Test 5: Bot Idle Behavior")
	simulation.BotIdleBehavior(cli)
	cli.PrintStatus()
}
