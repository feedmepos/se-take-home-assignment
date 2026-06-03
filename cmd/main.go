package main

import (
	"fmt"
	"os"
	"time"

	"feedmepos_homework/internal/controller"
)

func main() {
	c := controller.NewController(os.Stdout)
	defer c.Stop()

	fmt.Println("McDonald's Order Management System - CLI Simulation")
	fmt.Printf("[%s] System initialized with 0 bots\n", time.Now().Format("15:04:05"))

	mockCommand(c)

	waitForCompletions(c.Completed(), 11*time.Second)
	printFinalStatus(c.Snapshot())
}

func mockCommand(c *controller.Controller) {
	c.NewOrder(controller.Normal)
	c.NewOrder(controller.Normal)
	c.NewOrder(controller.VIP)
	c.NewOrder(controller.Normal)

	time.Sleep(1 * time.Second)
	c.AddBot()

	time.Sleep(1 * time.Second)
	c.AddBot()

	// Wait for orders to complete (10+ seconds each)
	time.Sleep(12 * time.Second)
	c.NewOrder(controller.VIP)
	time.Sleep(1 * time.Second)

	c.RemoveBot()
}

// waitForCompletions 会一直等订单完成事件。
// 每完成一单就重新计时；如果连续一段时间没有新订单完成，就认为模拟流程结束。
func waitForCompletions(completed <-chan controller.Order, timeout time.Duration) {
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	for {
		select {
		case <-completed:
			timer.Reset(timeout)
		case <-timer.C:
			return
		}
	}
}

func printFinalStatus(snapshot controller.Snapshot) {
	vipCompleted := 0
	normalCompleted := 0
	for _, order := range snapshot.Completed {
		if order.Type == controller.VIP {
			vipCompleted++
		} else {
			normalCompleted++
		}
	}

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", len(snapshot.Completed), vipCompleted, normalCompleted)
	fmt.Printf("- Orders Completed: %d\n", len(snapshot.Completed))
	fmt.Printf("- Active Bots: %d\n", len(snapshot.Bots))
	fmt.Printf("- Pending Orders: %d\n", len(snapshot.Pending))
}
