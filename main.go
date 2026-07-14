package main

import (
	"os"
	"time"
)

func main() {
	oc := NewOrderController(os.Stdout, 10*time.Second)

	oc.logRaw("McDonald's Order Management System - Simulation Results")
	oc.logRaw("")
	oc.log("System initialized with 0 bots")

	// 步骤 2：创建 Normal Order #1001
	sleepBriefly()
	oc.AddNormalOrder()

	// 步骤 3：创建 VIP Order #1002
	sleepBriefly()
	oc.AddVIPOrder()

	// 步骤 4：创建 Normal Order #1003
	sleepBriefly()
	oc.AddNormalOrder()

	// 步骤 5：添加 Bot #1 → 取 VIP #1002
	sleepBriefly()
	oc.AddBot()

	// 步骤 6：添加 Bot #2 → 取 Normal #1001
	sleepBriefly()
	oc.AddBot()

	// 步骤 7：移除正在处理 Normal #1001 的 Bot #2
	// → Normal #1001 按 ID 顺序回归 normalPending
	sleepBriefly()
	oc.RemoveNewestBot()
	time.Sleep(300 * time.Millisecond) // 等待 goroutine 完成 returnOrder

	// 步骤 8：等待 Bot #1 完成 VIP #1002（从步骤 5 算起约 10s）
	// → Bot #1 接着取 Normal #1001
	time.Sleep(10 * time.Second)
	time.Sleep(300 * time.Millisecond) // 确保 Bot #1 已取 Normal #1001

	// 步骤 9：创建 VIP Order #1004 → vipPending（无空闲机器人，等待）
	sleepBriefly()
	oc.AddVIPOrder()

	// 步骤 10：等待 Bot #1 完成 Normal #1001（从步骤 8 取单算起约 10s）
	// → Bot #1 接着取 VIP #1004
	time.Sleep(10 * time.Second)
	time.Sleep(300 * time.Millisecond)

	// 步骤 11：添加 Bot #3 → 取 Normal #1003
	sleepBriefly()
	oc.AddBot()

	// 步骤 12-13：等待 Bot #1 完成 VIP #1004、Bot #3 完成 Normal #1003
	time.Sleep(11 * time.Second)
	oc.WaitForIdle()

	// 步骤 14：移除 Bot #3（空闲）
	sleepBriefly()
	oc.RemoveNewestBot()
	time.Sleep(300 * time.Millisecond)

	// 步骤 15：移除 Bot #1（空闲）
	sleepBriefly()
	oc.RemoveNewestBot()
	time.Sleep(300 * time.Millisecond)

	// 步骤 16：打印最终状态
	oc.PrintStatus()
}

func sleepBriefly() {
	time.Sleep(200 * time.Millisecond)
}
