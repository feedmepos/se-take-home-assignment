package main

import (
	"feedme-takehome/config"
	"feedme-takehome/data/repositories"
	"feedme-takehome/presentation"
	"feedme-takehome/simulation"
	"feedme-takehome/utils"
	"fmt"
	"time"
)

func main() {
	orderRepo := repositories.NewInMemoryOrderRepository()
	botRepo := repositories.NewInMemoryBotRepository()

	output, err := utils.NewFileOutputWriter("scripts/result.txt")
	if err != nil {
		panic(err)
	}

	cli := presentation.NewCLI(nil)

	deps := config.InitializeDependencies(orderRepo, botRepo, output, cli)

	cli.SetDependencies(deps)

	// Print header
	output.WriteLine("McDonald's Order Management System - Simulation Results")
	output.WriteLine("")

	// Print initialization message
	timestamp := time.Now().Format("15:04:05")
	output.WriteLine(fmt.Sprintf("[%s] System initialized with 0 bots", timestamp))

	cli.Start()
	defer cli.Stop()

	simulation.BasicOrderFlow(cli, output)
	simulation.VIPPriority(cli, output)
	simulation.BotRemovalMidProcessing(cli, output)
	simulation.MultipleVIPOrdering(cli, output)
	simulation.BotIdleBehavior(cli, output)

	// Wait for all bots to finish processing before exiting
	// Program exits only when: all bots are idle AND no pending orders,
	// OR there are pending orders but no bots to process them
	cli.WaitForCompletion()
	cli.PrintStatus()
}
