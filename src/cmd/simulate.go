package cmd

import (
	"fmt"
	"ordercontroller/controller"
	"time"

	"github.com/spf13/cobra"
)

var simulateCmd = &cobra.Command{
	Use:   "simulate",
	Short: "运行模拟场景",
	Long:  "运行固定的模拟场景，输出订单处理流程到 stdout",
	RunE: func(cmd *cobra.Command, args []string) error {
		runSimulate()
		return nil
	},
}

func init() {
	rootCmd.AddCommand(simulateCmd)
}

func runSimulate() {
	clk := controller.RealClock{}

	ctrl := controller.NewController(func(e controller.Event) {
		fmt.Println(controller.FormatEvent(e))
	}, clk)

	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	// 模拟场景
	ctrl.NewOrder(controller.OrderNormal) // #1000
	time.Sleep(1 * time.Second)

	ctrl.NewOrder(controller.OrderVIP) // #1001
	time.Sleep(0)

	ctrl.NewOrder(controller.OrderNormal) // #1002
	time.Sleep(1 * time.Second)

	ctrl.AddBot() // Bot #1 → 取走 VIP #1001
	time.Sleep(1 * time.Second)

	ctrl.AddBot() // Bot #2 → 取走 Normal #1000
	time.Sleep(1 * time.Second)

	// 等待 Bot #1 完成 VIP #1001 (10秒)
	time.Sleep(9 * time.Second)

	// 等待 Bot #2 完成 Normal #1000
	time.Sleep(1 * time.Second)

	// 创建新 VIP 订单
	ctrl.NewOrder(controller.OrderVIP) // #1003
	time.Sleep(1 * time.Second)

	// 等待剩余处理完成
	time.Sleep(10 * time.Second)

	// 移除 Bot #2
	ctrl.RemoveBot()
	time.Sleep(500 * time.Millisecond)

	// 等待最后的处理完成
	time.Sleep(10 * time.Second)

	// 打印最终状态
	status := ctrl.GetStatus()
	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d\n", status.TotalOrders)
	fmt.Printf("- Orders Completed: %d\n", status.Complete)
	fmt.Printf("- Active Bots: %d\n", status.ActiveBots+status.IdleBots)
	fmt.Printf("- Pending Orders: %d\n", status.Pending)
}
