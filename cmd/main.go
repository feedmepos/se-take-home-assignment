package main

import (
	"fmt"
	"time"
	"feedme-order-controller/internal/order"
	"feedme-order-controller/internal/bot"
)

func main() {
	fmt.Println("========================================")
	fmt.Println("  McDonald's Order Management System")
	fmt.Println("========================================")
	fmt.Println()

	// 创建订单管理器和机器人管理器
	orderMgr := order.NewOrderManager()
	botMgr := bot.NewBotManager(orderMgr)

	// 演示场景：模拟各种操作
	fmt.Println("=== 场景演示开始 ===")
	fmt.Println()

	// 1. 添加一些普通订单
	fmt.Println("1. 添加普通订单...")
	order1 := orderMgr.AddOrder(order.NormalOrder)
	fmt.Printf("   %s 创建了%s\n", time.Now().Format("15:04:05"), order1.String())
	
	time.Sleep(500 * time.Millisecond)
	
	order2 := orderMgr.AddOrder(order.NormalOrder)
	fmt.Printf("   %s 创建了%s\n", time.Now().Format("15:04:05"), order2.String())
	
	fmt.Println()

	// 2. 添加VIP订单（应该排在普通订单前面）
	fmt.Println("2. 添加VIP订单...")
	order3 := orderMgr.AddOrder(order.VIPOrder)
	fmt.Printf("   %s 创建了%s\n", time.Now().Format("15:04:05"), order3.String())
	
	fmt.Println()

	// 3. 添加一个机器人开始处理订单
	fmt.Println("3. 添加第一个机器人...")
	bot1 := botMgr.AddBot()
	fmt.Printf("   %s %s\n", time.Now().Format("15:04:05"), bot1.String())
	
	fmt.Println()

	// 等待一段时间让机器人处理订单
	time.Sleep(2 * time.Second)

	// 4. 再添加一个VIP订单
	fmt.Println("4. 添加另一个VIP订单...")
	order4 := orderMgr.AddOrder(order.VIPOrder)
	fmt.Printf("   %s 创建了%s\n", time.Now().Format("15:04:05"), order4.String())
	
	fmt.Println()

	// 5. 添加第二个机器人
	fmt.Println("5. 添加第二个机器人...")
	bot2 := botMgr.AddBot()
	fmt.Printf("   %s %s\n", time.Now().Format("15:04:05"), bot2.String())
	
	fmt.Println()

	// 等待一段时间
	time.Sleep(2 * time.Second)

	// 6. 显示当前状态
	fmt.Println("6. 当前系统状态:")
	printSystemStatus(orderMgr, botMgr)
	
	fmt.Println()

	// 7. 移除一个机器人
	fmt.Println("7. 移除一个机器人...")
	botMgr.RemoveBot()
	
	fmt.Println()

	// 8. 显示最终状态
	fmt.Println("8. 最终系统状态:")
	printSystemStatus(orderMgr, botMgr)
	
	fmt.Println()

	// 9. 输出所有结果
	fmt.Println("=== 所有操作记录 ===")
	results := botMgr.GetResults()
	for _, result := range results {
		fmt.Println(result)
	}
	
	fmt.Println()
	fmt.Println("=== 场景演示结束 ===")
	
	// 等待所有正在处理的订单完成
	time.Sleep(12 * time.Second)
	
	// 输出最终结果
	fmt.Println()
	fmt.Println("=== 最终结果 ===")
	finalResults := botMgr.GetResults()
	for _, result := range finalResults {
		fmt.Println(result)
	}
	
	printSystemStatus(orderMgr, botMgr)
}

// printSystemStatus 打印系统状态
func printSystemStatus(orderMgr *order.OrderManager, botMgr *bot.BotManager) {
	fmt.Printf("   待处理订单数: %d\n", orderMgr.GetPendingOrdersCount())
	fmt.Printf("   处理中订单数: %d\n", orderMgr.GetProcessingOrdersCount())
	fmt.Printf("   已完成订单数: %d\n", orderMgr.GetCompletedOrdersCount())
	fmt.Printf("   活跃机器人数: %d\n", botMgr.GetBotCount())
	
	// 显示待处理和处理中的订单
	pendingAndProcessing := orderMgr.GetPendingAndProcessingOrders()
	if len(pendingAndProcessing) > 0 {
		fmt.Println("   订单队列:")
		for _, order := range pendingAndProcessing {
			fmt.Printf("     - %s\n", order.String())
		}
	}
}
