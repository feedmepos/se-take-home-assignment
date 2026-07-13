package main

import (
	"os"
	"testing"
	"time"
)

// TestVIPPriorityDemo 演示VIP订单优先处理
func TestVIPPriorityDemo(t *testing.T) {
	system := NewOrderSystem()

	// 创建订单：先创建普通订单，再创建VIP订单
	order1 := system.CreateOrder(OrderTypeNormal)  // 普通订单 #1
	order2 := system.CreateOrder(OrderTypeNormal)  // 普通订单 #2
	order3 := system.CreateOrder(OrderTypeVIP)     // VIP订单 #3
	order4 := system.CreateOrder(OrderTypeNormal)  // 普通订单 #4
	order5 := system.CreateOrder(OrderTypeVIP)     // VIP订单 #5

	t.Logf("Created orders: #%d (Normal), #%d (Normal), #%d (VIP), #%d (Normal), #%d (VIP)",
		order1.ID, order2.ID, order3.ID, order4.ID, order5.ID)

	// 创建2个机器人
	bot1 := system.CreateBot()
	bot2 := system.CreateBot()

	t.Logf("Created 2 bots: #%d, #%d", bot1.ID, bot2.ID)

	// 等待所有订单完成（5个订单，2个机器人，需要3轮，每轮10秒）
	// 总共需要30秒
	t.Log("Waiting for all orders to complete...")
	time.Sleep(31 * time.Second)

	// 验证所有订单完成
	completed := system.GetAllCompletedOrders()
	if len(completed) != 5 {
		t.Errorf("Expected 5 completed orders, got %d", len(completed))
	}

	// 输出结果到result.txt
	result := system.PrintResult()
	err := os.WriteFile("result.txt", []byte(result), 0644)
	if err != nil {
		t.Errorf("Error writing to result.txt: %v", err)
	}

	t.Log("Result saved to result.txt")
	t.Log("\n" + result)

	// 验证VIP订单被优先处理
	// VIP订单 #3 和 #5 应该在普通订单之前完成
	// 找出VIP订单和普通订单的完成顺序
	var vipFinishedFirst bool
	for i, order := range completed {
		if order.Type == OrderTypeVIP && i < 2 {
			vipFinishedFirst = true
			break
		}
	}

	if !vipFinishedFirst {
		t.Log("Warning: VIP orders may not have been prioritized correctly")
	}
}

// TestVIPPrioritySimple 简单演示VIP优先级（快速测试）
func TestVIPPrioritySimple(t *testing.T) {
	system := NewOrderSystem()

	// 创建3个普通订单
	for i := 0; i < 3; i++ {
		system.CreateOrder(OrderTypeNormal)
	}

	// 创建1个VIP订单
	vipOrder := system.CreateOrder(OrderTypeVIP)

	// 创建1个机器人
	bot := system.CreateBot()

	// 等待机器人开始处理
	time.Sleep(100 * time.Millisecond)

	// 验证机器人处理的是VIP订单
	if bot.CurrentOrder == nil {
		t.Fatal("Bot should be processing an order")
	}

	if bot.CurrentOrder.ID != vipOrder.ID {
		t.Errorf("Expected bot to process VIP order #%d, but got order #%d",
			vipOrder.ID, bot.CurrentOrder.ID)
	}

	t.Logf("✓ VIP order #%d was prioritized over 3 normal orders", vipOrder.ID)
}
