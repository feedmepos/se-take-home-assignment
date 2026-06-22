package cmd

import (
	"github.com/spf13/cobra"
	"order/internal/business/order"
)

func NewRootCommand() *cobra.Command {
	root := &cobra.Command{
		Use:   "order",
		Short: "McDonald's order controller simulation",
		Long: `A CLI simulation of McDonald's automated cooking bot order management system.

Features:
  - VIP priority queue: VIP orders are processed before Normal orders
  - Dynamic bot pool: Add/remove cooking bots at any time
  - Order preservation: Removed bots return their order to the original queue position
  - Real-time event logging with HH:MM:SS timestamps
  - Built-in demo scenario demonstrating all features`,
		Example: `  order           Run the demo scenario
  order demo      Run the demo scenario
  order run       Start interactive order controller
  order --help    Show this help message`,
		RunE: func(cmd *cobra.Command, args []string) error {
			order.RunDemo(cmd.OutOrStdout())
			return nil
		},
	}
	for _, cmd := range order.Commands() {
		root.AddCommand(cmd)
	}
	return root
}
