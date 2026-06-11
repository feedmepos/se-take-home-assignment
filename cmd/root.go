package cmd

import (
	"foundation-cli/internal/business/order"
	"github.com/spf13/cobra"
)

func NewRootCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "order-controller",
		Short: "McDonald's order controller simulation",
		RunE: func(cmd *cobra.Command, args []string) error {
			order.RunDemo(cmd.OutOrStdout())
			return nil
		},
	}
}
