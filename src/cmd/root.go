package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "order-controller",
	Short: "McDonald's 订单控制系统",
	Long:  "McDonald's 烹饪 Bot 订单管理系统 — 管理订单流程与 Bot 调度",
	// 默认执行 simulate 模式
	Run: func(cmd *cobra.Command, args []string) {
		runSimulate()
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
