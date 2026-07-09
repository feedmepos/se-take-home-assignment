package main

import (
	"fmt"
	"os"
	"time"

	"mcdonalds-order-controller/controller"
	"mcdonalds-order-controller/model"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	logger := func(format string, args ...interface{}) {
		fmt.Printf(format+"\n", args...)
	}

	switch os.Args[1] {
	case "order":
		if len(os.Args) < 4 || os.Args[2] != "add" {
			fmt.Println("Usage: ./app order add --type [normal|vip]")
			os.Exit(1)
		}
		ctrl := controller.New(logger)
		orderType := parseOrderType(os.Args)
		ctrl.AddOrder(orderType)

	case "bot":
		if len(os.Args) < 3 {
			fmt.Println("Usage: ./app bot [up|down]")
			os.Exit(1)
		}
		ctrl := controller.New(logger)
		switch os.Args[2] {
		case "up":
			ctrl.AddBot()
		case "down":
			ctrl.RemoveBot()
		default:
			fmt.Printf("Unknown bot command: %s\n", os.Args[2])
			os.Exit(1)
		}

	case "status":
		controller.New(logger).PrintStatus()

	case "simulate":
		runSimulate(logger)

	default:
		fmt.Printf("Unknown command: %s\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

// parseOrderType 从命令行参数提取 --type 值
func parseOrderType(args []string) model.OrderType {
	for i, arg := range args {
		if arg == "--type" && i+1 < len(args) {
			switch args[i+1] {
			case "vip":
				return model.VIP
			case "normal":
				return model.Normal
			}
		}
	}
	fmt.Println("Error: --type must be 'normal' or 'vip'")
	os.Exit(1)
	return model.Normal
}

// runSimulate 自动演示全部 7 项需求
func runSimulate(logger func(string, ...interface{})) {
	ctrl := controller.New(logger)

	logger("[%s] === 模拟开始 ===", now())

	// 需求 1&2: 普通/VIP 订单入 PENDING，VIP 排在普通之前，同类 FIFO
	ctrl.AddOrder(model.Normal) // 订单 1
	ctrl.AddOrder(model.Normal) // 订单 2
	ctrl.AddOrder(model.VIP)    // 订单 3 — 排在普通 1、2 之前
	ctrl.AddOrder(model.VIP)    // 订单 4 — 在 VIP 3 之后、普通之前
	// 需求 3: ID 唯一递增 (1,2,3,4)
	logger("[%s] --- PENDING: VIP#3, VIP#4, Normal#1, Normal#2 ---", now())
	ctrl.PrintStatus()

	// 需求 4: 机器人立即领取订单，10秒后完成，自动领取下一个
	ctrl.AddBot() // 机器人 1 → 领取 VIP#3
	ctrl.AddBot() // 机器人 2 → 领取 VIP#4
	logger("[%s] --- 机器人已创建，等待 12 秒让 VIP 订单完成 ---", now())
	time.Sleep(12 * time.Second)
	logger("[%s] --- VIP 订单完成，机器人开始处理普通订单 ---", now())
	ctrl.PrintStatus()

	// 需求 5: 无订单时机器人空闲，新订单到来立即领取
	ctrl.AddBot() // 机器人 3 → 空闲
	logger("[%s] --- 机器人#3 创建 → 空闲 ---", now())
	time.Sleep(50 * time.Millisecond)
	ctrl.AddOrder(model.VIP) // 订单 5 → 空闲机器人 3 立即领取
	logger("[%s] --- VIP#5 添加 → 机器人#3 立即领取 ---", now())

	// 需求 6: 销毁最新机器人，其订单返回队列头部
	time.Sleep(100 * time.Millisecond)
	ctrl.RemoveBot()
	logger("[%s] --- 机器人#3 销毁 → VIP#5 返回 PENDING ---", now())
	ctrl.PrintStatus()

	logger("[%s] --- 等待 20 秒让剩余机器人完成所有订单 ---", now())
	time.Sleep(20 * time.Second)

	// 需求 7: 所有状态均在内存中
	logger("[%s] === 最终状态 ===", now())
	ctrl.PrintStatus()
	logger("[%s] === 模拟结束 ===", now())
}

// now 返回当前时间 HH:MM:SS
func now() string {
	return time.Now().Format("15:04:05")
}

func printUsage() {
	fmt.Println("Usage:")
	fmt.Println("  ./app order add --type [normal|vip]  添加新订单")
	fmt.Println("  ./app bot up                         添加新机器人")
	fmt.Println("  ./app bot down                       销毁最新机器人")
	fmt.Println("  ./app status                         打印当前状态")
	fmt.Println("  ./app simulate                       运行自动模拟")
}
