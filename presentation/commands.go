package presentation

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// App holds the application state and commands
type App struct {
	cli      *CLI
	stats    *SessionStats
	rootCmd  *cobra.Command
	commands map[string]*cobra.Command
}

// SessionStats tracks statistics for the current session
type SessionStats struct {
	NormalOrdersCreated int
	VIPOrdersCreated    int
	BotsAdded           int
	BotsRemoved         int
}

// NewApp creates a new application with Cobra commands
func NewApp(cli *CLI) *App {
	app := &App{
		cli:      cli,
		stats:    &SessionStats{},
		commands: make(map[string]*cobra.Command),
	}

	app.initCommands()
	return app
}

func (app *App) initCommands() {
	// Root command
	app.rootCmd = &cobra.Command{
		Use:   "mcdonalds-bot",
		Short: "McDonald's Order Management System",
		Long: `McDonald's Order Management System - Interactive CLI

This system manages food orders using cooking bots.

How it works:
  • Bots process orders in REAL-TIME (10 seconds per order)
  • VIP orders have priority over normal orders
  • When a bot is removed while processing, the order returns to queue
  • You can continue entering commands while orders are being processed`,
		Run: func(cmd *cobra.Command, args []string) {
			app.RunInteractive()
		},
	}

	// Add bot command
	app.commands["add-bot"] = &cobra.Command{
		Use:   "add-bot",
		Short: "Add a new cooking bot",
		Long:  "Add a new cooking bot to the system. The bot will automatically pick up pending orders.",
		Run: func(cmd *cobra.Command, args []string) {
			err := app.cli.AddBot()
			if err == nil {
				app.stats.BotsAdded++
			}
			fmt.Println()
		},
	}

	// Remove bot command
	app.commands["remove-bot"] = &cobra.Command{
		Use:   "remove-bot",
		Short: "Remove the most recently added bot",
		Long:  "Remove the most recently added bot. If the bot is processing an order, the order returns to the queue.",
		Run: func(cmd *cobra.Command, args []string) {
			err := app.cli.RemoveBot()
			if err == nil {
				app.stats.BotsRemoved++
			}
			fmt.Println()
		},
	}

	// Add order command
	app.commands["add-order"] = &cobra.Command{
		Use:   "add-order",
		Short: "Create a new normal order",
		Long:  "Create a new normal order. Normal orders are processed in FIFO order, after any VIP orders.",
		Run: func(cmd *cobra.Command, args []string) {
			err := app.cli.CreateNormalOrder()
			if err == nil {
				app.stats.NormalOrdersCreated++
			}
			fmt.Println()
		},
	}

	// Add VIP order command
	app.commands["add-vip-order"] = &cobra.Command{
		Use:   "add-vip-order",
		Short: "Create a new VIP order (priority)",
		Long:  "Create a new VIP order. VIP orders have priority and are processed before normal orders.",
		Run: func(cmd *cobra.Command, args []string) {
			err := app.cli.CreateVIPOrder()
			if err == nil {
				app.stats.VIPOrdersCreated++
			}
			fmt.Println()
		},
	}

	// Status command
	app.commands["status"] = &cobra.Command{
		Use:   "status",
		Short: "Show current system status",
		Long:  "Display the current system status including completed orders, active bots, and pending orders.",
		Run: func(cmd *cobra.Command, args []string) {
			app.cli.PrintStatus()
			fmt.Println()
		},
	}

	// Add all subcommands to root
	for _, cmd := range app.commands {
		app.rootCmd.AddCommand(cmd)
	}
}

// Execute runs the root command
func (app *App) Execute() {
	if err := app.rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

// GetStats returns the session statistics
func (app *App) GetStats() *SessionStats {
	return app.stats
}

// GetCommand returns a command by name for interactive execution
func (app *App) GetCommand(name string) *cobra.Command {
	return app.commands[name]
}
