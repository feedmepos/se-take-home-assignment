package main


import (
	"context"
	"mcdonalds-order-controller/application"
	"mcdonalds-order-controller/domain"
	"mcdonalds-order-controller/infrastructure"
	"mcdonalds-order-controller/interfaces/cli"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	// Initialize Snowflake ID generator
	snowflake, err := infrastructure.NewSnowflake(1)
	if err != nil {
		panic(err)
	}

	// Initialize Bot Scheduler
	scheduler := domain.NewBotScheduler()

	// Initialize Services
	orderService := application.NewOrderService(snowflake, scheduler)
	botService := application.NewBotService(scheduler)

	// Initialize CLI
	cliInterface := cli.NewCLI(orderService, botService, scheduler, os.Stdout)

	// Create context with cancel
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start background processing loop
	go scheduler.ProcessLoop(ctx)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		cancel()
		scheduler.Stop()
		os.Exit(0)
	}()

	// Run CLI
	cliInterface.Run()
}
