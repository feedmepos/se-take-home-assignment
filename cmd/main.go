package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"order-controller/pkg/controller"
)

func main() {
	// 默认交互式模式，传入 simulate 参数则执行模拟模式
	if len(os.Args) > 1 && os.Args[1] == "simulate" {
		runSimulation()
		return
	}
	runInteractive()
}

// runInteractive 启动交互式命令行，用户可实时操作订单系统。
func runInteractive() {
	ctrl := controller.NewOrderController()
	ctrl.LogWithTimestamp("System initialized with 0 bots")

	fmt.Println("McDonald's Order Management System")
	fmt.Println("Commands:")
	fmt.Println("  n  - New Normal Order")
	fmt.Println("  v  - New VIP Order")
	fmt.Println("  +  - Add Bot")
	fmt.Println("  -  - Remove Bot")
	fmt.Println("  s  - Print Status")
	fmt.Println("  q  - Quit")
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		cmd := strings.TrimSpace(scanner.Text())
		switch cmd {
		case "n":
			ctrl.CreateNormalOrder()
		case "v":
			ctrl.CreateVIPOrder()
		case "+":
			ctrl.AddBot()
		case "-":
			ctrl.RemoveBot()
		case "s":
			ctrl.PrintStatus()
		case "q":
			fmt.Println("Goodbye!")
			return
		case "":
			// 忽略空输入
		default:
			fmt.Printf("Unknown command: %s\n", cmd)
		}
	}
}

// runSimulation 运行预设的模拟场景，演示所有需求点。
func runSimulation() {

	ctrl := controller.NewOrderController()

	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	ctrl.LogWithTimestamp("System initialized with 0 bots")

	// 需求 1 & 2: 创建订单
	ctrl.CreateNormalOrder()
	ctrl.CreateVIPOrder()
	ctrl.CreateNormalOrder()

	time.Sleep(1 * time.Second)

	// 需求 4 & 5: 添加机器人并处理订单
	ctrl.AddBot()
	time.Sleep(1 * time.Second)
	ctrl.AddBot()

	// 等待订单完成（每单 10 秒）
	time.Sleep(12 * time.Second)

	// 需求 6: 处理中移除机器人
	ctrl.CreateVIPOrder()
	time.Sleep(1 * time.Second)

	time.Sleep(12 * time.Second)

	// 测试空闲状态
	ctrl.RemoveBot()

	ctrl.PrintFinalStatus()
}
