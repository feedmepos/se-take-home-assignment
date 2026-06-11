package order

import (
	"github.com/spf13/cobra"
)

// Commands returns the cobra commands for the order domain.
func Commands() []*cobra.Command {
	return []*cobra.Command{
		{
			Use:   "demo",
			Short: "Run the built-in demo scenario",
			Long:  "Executes a predefined scenario demonstrating all order controller features including VIP prioritization, dynamic bot pool, and order return on bot removal.",
			RunE: func(cmd *cobra.Command, args []string) error {
				RunDemo(cmd.OutOrStdout())
				return nil
			},
		},
	}
}
