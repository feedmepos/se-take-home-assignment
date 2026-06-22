package order

import (
	"github.com/spf13/cobra"
)

// Commands returns the cobra commands for the order domain.
func Commands() []*cobra.Command {
	demoCmd := &cobra.Command{
		Use:   "demo",
		Short: "Run the built-in demo scenario",
		Long: `Run a predefined simulation demonstrating all order controller features.

The demo creates 4 orders (2 Normal + 2 VIP), adds 3 bots, removes 1 bot,
then adds another order — all while showing real-time event output with
HH:MM:SS timestamps. Each order takes 2 seconds to "cook".`,
		Example: `  order demo
  order demo --duration 5`,
		RunE: func(cmd *cobra.Command, args []string) error {
			RunDemo(cmd.OutOrStdout())
			return nil
		},
	}
	demoCmd.Flags().IntP("duration", "d", 2, "processing duration per order in seconds")

	runCmd := &cobra.Command{
		Use:   "run",
		Short: "Start interactive order controller",
		Long: `Launch an interactive session to manage orders and bots in real time.

Available commands during session:
  order normal          - Place a new Normal order
  order vip             - Place a new VIP order
  bot add               - Add a cooking bot
  bot remove            - Remove the newest cooking bot
  status                - Show current queue and bot status
  exit / quit / q       - End the session`,
		Example: `  order run
  order> order normal
  order> order vip
  order> bot add
  order> status
  order> exit`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return RunInteractive(cmd.OutOrStdout(), cmd.InOrStdin())
		},
	}

	return []*cobra.Command{demoCmd, runCmd}
}
