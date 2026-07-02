package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

type Logger interface {
	Logf(format string, args ...interface{})
}

type FileLogger struct {
	mu   sync.Mutex
	file *os.File
}

func NewFileLogger(filename string) (*FileLogger, error) {
	file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return nil, err
	}
	return &FileLogger{file: file}, nil
}

func (l *FileLogger) Logf(format string, args ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintf(l.file, "%s %s\n", now().Format("15:04:05"), fmt.Sprintf(format, args...))
	l.file.Sync()
}

func (l *FileLogger) Close() {
	l.file.Close()
}

func now() time.Time {
	return time.Now()
}

func main() {
	logger, err := NewFileLogger("scripts/result.txt")
	if err != nil {
		fmt.Printf("Failed to create logger: %v\n", err)
		return
	}
	defer logger.Close()

	queue := NewOrderQueue(logger)
	var robots []*Robot
	var nextRobotID = 1
	var mu sync.Mutex

	fmt.Println("=== 麦当劳订单调度控制器 ===")
	fmt.Println("命令列表:")
	fmt.Println("  addOrder        - 新建普通订单")
	fmt.Println("  addVipOrder     - 新建VIP订单")
	fmt.Println("  addRobot        - 新增机器人")
	fmt.Println("  removeRobot     - 移除机器人")
	fmt.Println("  status          - 查看状态")
	fmt.Println("  quit            - 退出")
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("请输入命令: ")
		scanner.Scan()
		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}

		switch input {
		case "addOrder":
			order := queue.AddOrder(OrderTypeNormal)
			logger.Logf("Created Order %d (NORMAL)", order.ID)
			fmt.Printf("已创建普通订单: Order[%d]\n", order.ID)

		case "addVipOrder":
			order := queue.AddOrder(OrderTypeVIP)
			logger.Logf("Created Order %d (VIP)", order.ID)
			fmt.Printf("已创建VIP订单: Order[%d]\n", order.ID)

		case "addRobot":
			mu.Lock()
			robot := NewRobot(nextRobotID, queue, logger)
			robots = append(robots, robot)
			nextRobotID++
			mu.Unlock()
			logger.Logf("Created Robot %d", robot.ID)
			fmt.Printf("已新增机器人: Robot[%d]\n", robot.ID)

		case "removeRobot":
			mu.Lock()
			if len(robots) == 0 {
				mu.Unlock()
				fmt.Println("没有可移除的机器人")
				continue
			}
			robot := robots[len(robots)-1]
			robots = robots[:len(robots)-1]
			mu.Unlock()
			logger.Logf("Destroying Robot %d", robot.ID)
			robot.Destroy()
			fmt.Printf("已移除机器人: Robot[%d]\n", robot.ID)

		case "status":
			logger.Logf("[STATUS] Starting status check")

			pendingOrders := queue.GetPendingOrders()
			logger.Logf("[STATUS] Read pending orders: %d", len(pendingOrders))
			for _, o := range pendingOrders {
				logger.Logf("[STATUS]   PENDING: Order[%d] Type=%s Status=%s", o.ID, o.Type, o.Status)
			}

			completedOrders := queue.GetCompletedOrders()
			logger.Logf("[STATUS] Read completed orders: %d", len(completedOrders))
			for _, o := range completedOrders {
				logger.Logf("[STATUS]   COMPLETE: Order[%d] Type=%s Status=%s CompletedAt=%s", o.ID, o.Type, o.Status, o.CompletedAt.Format("15:04:05"))
			}

			fmt.Println("\n╔══════════════════════════════════════════════════════════════╗")
			fmt.Println("║                    麦当劳订单调度控制器                       ║")
			fmt.Println("╚══════════════════════════════════════════════════════════════╝")

			mu.Lock()
			var cookingOrders []*Order
			for _, robot := range robots {
				currentOrder := robot.GetCurrentOrder()
				if currentOrder != nil {
					cookingOrders = append(cookingOrders, currentOrder)
				}
			}
			logger.Logf("[STATUS] Cooking orders from robots: %d", len(cookingOrders))
			for _, o := range cookingOrders {
				logger.Logf("[STATUS]   COOKING: Order[%d] Type=%s", o.ID, o.Type)
			}
			mu.Unlock()

			fmt.Println("\n┌──────────────────────────────────────────────────────────────┐")
			fmt.Printf("│  正在制作 (%d)                                                │\n", len(cookingOrders))
			fmt.Println("├──────────────┬───────────┬───────────────────────────────────┤")
			fmt.Println("│   订单编号   │   类型    │              状态                  │")
			fmt.Println("├──────────────┼───────────┼───────────────────────────────────┤")
			for _, order := range cookingOrders {
				fmt.Printf("│  Order[%2d]  │  %6s   │              COOKING              │\n", order.ID, order.Type)
			}
			if len(cookingOrders) == 0 {
				fmt.Println("│                    (暂无正在制作的订单)                       │")
			}
			fmt.Println("└──────────────┴───────────┴───────────────────────────────────┘")

			fmt.Println("\n┌──────────────────────────────────────────────────────────────┐")
			fmt.Printf("│  待制作队列 (%d)                                              │\n", len(pendingOrders))
			fmt.Println("├──────────────┬───────────┬───────────────────────────────────┤")
			fmt.Println("│   订单编号   │   类型    │              状态                  │")
			fmt.Println("├──────────────┼───────────┼───────────────────────────────────┤")
			for _, order := range pendingOrders {
				fmt.Printf("│  Order[%2d]  │  %6s   │              PENDING              │\n", order.ID, order.Type)
			}
			if len(pendingOrders) == 0 {
				fmt.Println("│                      (队列为空)                              │")
			}
			fmt.Println("└──────────────┴───────────┴───────────────────────────────────┘")

			fmt.Println("\n┌──────────────────────────────────────────────────────────────┐")
			fmt.Printf("│  已完成订单 (%d)                                              │\n", len(completedOrders))
			fmt.Println("├──────────────┬───────────┬───────────────────────────────────┤")
			fmt.Println("│   订单编号   │   类型    │           完成时间                │")
			fmt.Println("├──────────────┼───────────┼───────────────────────────────────┤")
			for _, order := range completedOrders {
				fmt.Printf("│  Order[%2d]  │  %6s   │           %s           │\n", order.ID, order.Type, order.CompletedAt.Format("15:04:05"))
			}
			if len(completedOrders) == 0 {
				fmt.Println("│                      (暂无已完成订单)                         │")
			}
			fmt.Println("└──────────────┴───────────┴───────────────────────────────────┘")

			mu.Lock()
			logger.Logf("[STATUS] Robot count: %d", len(robots))
			fmt.Println("\n┌──────────────────────────────────────────────────────────────┐")
			fmt.Printf("│  机器人状态 (%d)                                              │\n", len(robots))
			fmt.Println("├──────────────┬───────────┬───────────────────────────────────┤")
			fmt.Println("│   机器人ID   │   状态    │           当前任务                │")
			fmt.Println("├──────────────┼───────────┼───────────────────────────────────┤")
			for _, robot := range robots {
				currentOrder := robot.GetCurrentOrder()
				if currentOrder != nil {
					logger.Logf("[STATUS]   Robot[%d] Status=%s CurrentOrder=Order[%d] Type=%s", robot.ID, robot.GetStatus(), currentOrder.ID, currentOrder.Type)
					fmt.Printf("│  Robot[%2d]  │  %6s   │ 制作 Order[%d] (%s)               │\n", robot.ID, robot.GetStatus(), currentOrder.ID, currentOrder.Type)
				} else {
					logger.Logf("[STATUS]   Robot[%d] Status=%s CurrentOrder=nil", robot.ID, robot.GetStatus())
					fmt.Printf("│  Robot[%2d]  │  %6s   │              IDLE                 │\n", robot.ID, robot.GetStatus())
				}
			}
			if len(robots) == 0 {
				fmt.Println("│                      (暂无机器人)                            │")
			}
			mu.Unlock()
			fmt.Println("└──────────────┴───────────┴───────────────────────────────────┘")

			totalOrders := len(cookingOrders) + len(pendingOrders) + len(completedOrders)
			logger.Logf("[STATUS] Total orders: %d (COOKING=%d, PENDING=%d, COMPLETE=%d)", totalOrders, len(cookingOrders), len(pendingOrders), len(completedOrders))

		case "quit":
			mu.Lock()
			for _, robot := range robots {
				robot.Destroy()
			}
			mu.Unlock()
			logger.Logf("Shutting down")
			fmt.Println("退出程序")
			return

		default:
			fmt.Println("无效命令，请重新输入")
			fmt.Println("可用命令: addOrder, addVipOrder, addRobot, removeRobot, status, quit")
		}
	}
}
