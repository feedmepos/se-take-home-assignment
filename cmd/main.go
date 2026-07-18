package main

import (
	"flag"
	"fmt"
	"time"

	"github.com/feedmepos/se-take-home-assignment/cli"
	"github.com/feedmepos/se-take-home-assignment/controller"
)

func main() {
	// 命令行参数
	interactive := flag.Bool("i", false, "交互模式：在命令行中手动操作订单和机器人")
	interactiveLong := flag.Bool("interactive", false, "同 -i，交互模式")
	duration := flag.Int("d", 10, "订单处理时间（秒），默认 10 秒")
	flag.Parse()

	isInteractive := *interactive || *interactiveLong
	processDuration := time.Duration(*duration) * time.Second

	if isInteractive {
		// ---- 交互模式 ----
		c := cli.New(processDuration)
		c.Run()
	} else {
		// ---- 模拟模式 ----
		fmt.Println("McDonald's Order Management System - Simulation Results")
		fmt.Println()
		fmt.Println("Tip: use -i flag for interactive CLI mode")
		fmt.Println()

		ctrl := controller.New(processDuration)
		runSimulation(ctrl)
	}
}

// runSimulation 执行模拟场景，演示所有核心需求
func runSimulation(ctrl *controller.Controller) {
	// ---- 阶段 1：创建初始订单 ----
	time.Sleep(1 * time.Second)
	ctrl.CreateNormalOrder() // #1001

	time.Sleep(1 * time.Second)
	ctrl.CreateVIPOrder()    // #1002
	ctrl.CreateNormalOrder() // #1003

	// ---- 阶段 2：添加机器人 ----
	time.Sleep(1 * time.Second)
	ctrl.AddBot() // Bot #1 — 取走 VIP #1002

	time.Sleep(1 * time.Second)
	ctrl.AddBot() // Bot #2 — 取走普通 #1001

	// ---- 阶段 3：等待处理完成 ----
	time.Sleep(11 * time.Second)

	// ---- 阶段 4：创建新的 VIP 订单 ----
	ctrl.CreateVIPOrder() // #1004 — 空闲 Bot 立即取走

	// ---- 阶段 5：等待处理完成 ----
	time.Sleep(11 * time.Second)

	// ---- 阶段 6：移除机器人 ----
	time.Sleep(1 * time.Second)
	ctrl.RemoveBot()

	// ---- 阶段 7：结束 ----
	time.Sleep(1 * time.Second)
	printSummary(ctrl)
}

func printSummary(ctrl *controller.Controller) {
	totalVIP := ctrl.TotalVIPOrders()
	totalNormal := ctrl.TotalNormalOrders()
	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Created: %d (%d VIP, %d Normal)\n",
		totalVIP+totalNormal,
		totalVIP,
		totalNormal,
	)
	fmt.Printf("- Orders Completed: %d\n", ctrl.CompletedOrders())
	fmt.Printf("- Active Bots: %d\n", ctrl.ActiveBots())
	fmt.Printf("- Pending Orders: %d\n", ctrl.PendingOrders())
}
