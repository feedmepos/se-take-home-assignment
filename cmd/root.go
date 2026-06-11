package cmd

import (
	"github.com/spf13/cobra"
	"order/internal/business/order"
)

func NewRootCommand() *cobra.Command {
	root := &cobra.Command{
		Use:   "order",
		Short: "McDonald's order controller simulation",
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
