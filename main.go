package main

import (
	"feedme-takehome/config"
	"feedme-takehome/data/repositories"
	"feedme-takehome/presentation"
	"feedme-takehome/services"
	"feedme-takehome/utils"
	"fmt"
	"os"
)

func main() {
	// Infrastructure layer
	orderRepo := repositories.NewInMemoryOrderRepository()
	botRepo := repositories.NewInMemoryBotRepository()

	// Create file output writer to write results to ./scripts/result.txt
	output, err := utils.NewFileOutputWriter("./scripts/result.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create output file: %v\n", err)
		os.Exit(1)
	}

	// Domain layer - use cases
	deps := config.InitializeDependencies(orderRepo, botRepo)

	// Service layer - background processing
	processingService := services.NewProcessingService(
		deps.AssignOrdersUC,
		deps.CompleteOrdersUC,
		deps.GetStatusUC,
	)

	// Presentation layer - CLI
	cli := presentation.NewCLI(&presentation.CLIDependencies{
		CreateOrderUC:     deps.CreateOrderUC,
		AddBotUC:          deps.AddBotUC,
		RemoveBotUC:       deps.RemoveBotUC,
		GetStatusUC:       deps.GetStatusUC,
		ProcessingService: processingService,
		Output:            output,
	})

	// Print header to result file
	cli.PrintHeader()

	// Presentation layer - App (Cobra commands + interactive loop)
	app := presentation.NewApp(cli)

	// Wire up event handler (presentation handles how to display events)
	processingService.SetEventHandler(app.CreateEventHandler())

	// Start background processing
	processingService.Start()

	// Run the application
	app.Execute()

	// Stop processing and print final status before exit
	processingService.Stop()
	cli.PrintFooter()
	cli.Flush()
}
