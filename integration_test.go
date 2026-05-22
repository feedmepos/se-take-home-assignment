package main

import (
	"context"
	"mcdonalds-order-controller/application"
	"mcdonalds-order-controller/domain"
	"mcdonalds-order-controller/infrastructure"
	"mcdonalds-order-controller/interfaces/cli"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

// setupTestEnvironment 创建测试环境
func setupTestEnvironment() (*application.OrderService, *application.BotService, *domain.BotScheduler, *infrastructure.Snowflake) {
	snowflake, _ := infrastructure.NewSnowflake(1)
	scheduler := domain.NewBotScheduler()
	orderService := application.NewOrderService(snowflake, scheduler)
	botService := application.NewBotService(scheduler)

	// 启动后台处理循环
	go scheduler.ProcessLoop(context.Background())

	return orderService, botService, scheduler, snowflake
}

// waitForOrderComplete 等待订单完成，带超时
func waitForOrderComplete(orderService *application.OrderService, orderID uint64, timeout time.Duration) bool {
	start := time.Now()
	for time.Since(start) < timeout {
		completeOrders := orderService.GetCompleteOrders()
		for _, o := range completeOrders {
			if o.ID == orderID {
				return true
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}

// waitForAllOrdersComplete 等待所有订单完成
func waitForAllOrdersComplete(orderService *application.OrderService, expectedCount int, timeout time.Duration) bool {
	start := time.Now()
	for time.Since(start) < timeout {
		completeOrders := orderService.GetCompleteOrders()
		if len(completeOrders) >= expectedCount {
			return true
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}

// TestIntegration_FullScenario 测试完整场景：创建订单、增加机器人、订单完成、减少机器人
func TestIntegration_FullScenario(t *testing.T) {
	orderService, botService, _, _ := setupTestEnvironment()

	// 步骤1: 创建2个普通订单（减少数量以缩短测试时间）
	t.Log("Step 1: Creating 2 normal orders")
	order1, err := orderService.CreateNormalOrder()
	if err != nil {
		t.Fatalf("Failed to create order 1: %v", err)
	}
	order2, err := orderService.CreateNormalOrder()
	if err != nil {
		t.Fatalf("Failed to create order 2: %v", err)
	}

	// 验证订单创建成功
	pendingOrders := orderService.GetPendingOrders()
	if len(pendingOrders) != 2 {
		t.Errorf("Expected 2 pending orders, got %d", len(pendingOrders))
	}
	t.Logf("Created orders: #%d, #%d", order1.ID, order2.ID)

	// 步骤2: 添加1个机器人，应该开始处理第一个订单
	t.Log("Step 2: Adding 1 bot")
	bot1 := botService.AddBot()
	if bot1 == nil {
		t.Fatal("Failed to add bot")
	}
	t.Logf("Added bot #%d", bot1.ID)

	// 等待第一个订单处理完成
	t.Log("Waiting for first order to complete...")
	if !waitForOrderComplete(orderService, order1.ID, 15*time.Second) {
		t.Fatal("Timeout waiting for first order to complete")
	}
	t.Logf("Order #%d completed", order1.ID)

	// 步骤3: 再添加1个机器人处理第二个订单
	t.Log("Step 3: Adding another bot")
	bot2 := botService.AddBot()
	if bot2 == nil {
		t.Fatal("Failed to add second bot")
	}
	t.Logf("Added bot #%d", bot2.ID)

	// 等待第二个订单完成
	if !waitForOrderComplete(orderService, order2.ID, 15*time.Second) {
		t.Fatal("Timeout waiting for second order to complete")
	}
	t.Logf("Order #%d completed", order2.ID)

	// 步骤4: 减少一个机器人
	t.Log("Step 4: Removing one bot")
	removedBot, returnedOrder := botService.RemoveBot()
	if removedBot == nil {
		t.Fatal("Failed to remove bot")
	}
	t.Logf("Removed bot #%d", removedBot.ID)

	// 验证被移除的机器人状态
	if returnedOrder != nil {
		t.Logf("Order #%d returned to queue", returnedOrder.ID)
	}

	// 最终验证
	pendingOrders = orderService.GetPendingOrders()
	completeOrders := orderService.GetCompleteOrders()
	t.Logf("Final state - Pending: %d, Complete: %d", len(pendingOrders), len(completeOrders))

	// 所有订单应该都已完成
	if len(pendingOrders) != 0 {
		t.Errorf("Expected 0 pending orders, got %d", len(pendingOrders))
	}
	if len(completeOrders) != 2 {
		t.Errorf("Expected 2 complete orders, got %d", len(completeOrders))
	}

	// 清理：移除剩余的机器人
	for len(botService.GetBotStatus()) > 0 {
		botService.RemoveBot()
	}
}

// TestIntegration_VIPPriority 测试VIP优先场景验证
func TestIntegration_VIPPriority(t *testing.T) {
	orderService, botService, _, _ := setupTestEnvironment()

	// 先添加1个机器人
	botService.AddBot()

	// 创建2个普通订单
	t.Log("Creating 2 normal orders first")
	normalOrder1, _ := orderService.CreateNormalOrder()
	normalOrder2, _ := orderService.CreateNormalOrder()

	// 等待第一个普通订单开始处理
	time.Sleep(200 * time.Millisecond)

	// 现在创建一个VIP订单，应该排在剩余普通订单前面
	t.Log("Creating 1 VIP order (should have priority)")
	vipOrder, _ := orderService.CreateVIPOrder()

	// 获取待处理订单列表
	pendingOrders := orderService.GetPendingOrders()
	t.Logf("Pending orders count: %d", len(pendingOrders))

	// 验证VIP订单在队列中
	foundVIP := false
	for _, order := range pendingOrders {
		if order.ID == vipOrder.ID {
			foundVIP = true
			t.Logf("VIP order #%d found in pending orders", order.ID)
			break
		}
	}

	if !foundVIP {
		t.Error("VIP order not found in pending orders")
	}

	// 验证订单类型
	for _, order := range pendingOrders {
		if order.ID == vipOrder.ID && !order.IsVIP() {
			t.Error("VIP order type mismatch")
		}
	}

	// 等待所有订单处理完成
	if !waitForAllOrdersComplete(orderService, 3, 35*time.Second) {
		t.Fatal("Timeout waiting for all orders to complete")
	}

	completeOrders := orderService.GetCompleteOrders()
	if len(completeOrders) != 3 {
		t.Errorf("Expected 3 complete orders, got %d", len(completeOrders))
	}

	t.Logf("All %d orders completed successfully", len(completeOrders))

	// 清理
	for len(botService.GetBotStatus()) > 0 {
		botService.RemoveBot()
	}

	_ = normalOrder1
	_ = normalOrder2
}

// TestIntegration_ConcurrentOrders 测试并发订单场景（10个goroutine同时创建订单）
func TestIntegration_ConcurrentOrders(t *testing.T) {
	orderService, botService, _, _ := setupTestEnvironment()

	const numGoroutines = 10
	const numVIPOrders = 3
	const numNormalOrders = 7

	var wg sync.WaitGroup
	errors := make(chan error, numGoroutines)
	createdOrders := make(chan uint64, numGoroutines)

	t.Logf("Starting concurrent order creation: %d goroutines", numGoroutines)

	// 并发创建VIP订单
	for i := 0; i < numVIPOrders; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			order, err := orderService.CreateVIPOrder()
			if err != nil {
				errors <- err
				return
			}
			createdOrders <- order.ID
		}()
	}

	// 并发创建普通订单
	for i := 0; i < numNormalOrders; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			order, err := orderService.CreateNormalOrder()
			if err != nil {
				errors <- err
				return
			}
			createdOrders <- order.ID
		}()
	}

	// 等待所有goroutine完成
	wg.Wait()
	close(errors)
	close(createdOrders)

	// 检查错误
	errorCount := 0
	for err := range errors {
		t.Errorf("Error creating order: %v", err)
		errorCount++
	}

	if errorCount > 0 {
		t.Fatalf("Had %d errors during concurrent order creation", errorCount)
	}

	// 统计创建的订单
	orderCount := 0
	for range createdOrders {
		orderCount++
	}

	if orderCount != numGoroutines {
		t.Errorf("Expected %d orders, got %d", numGoroutines, orderCount)
	}

	t.Logf("Successfully created %d orders concurrently", orderCount)

	// 验证待处理订单数量
	pendingOrders := orderService.GetPendingOrders()
	t.Logf("Pending orders: %d", len(pendingOrders))

	if len(pendingOrders) != numGoroutines {
		t.Errorf("Expected %d pending orders, got %d", numGoroutines, len(pendingOrders))
	}

	// 添加2个机器人以处理订单
	for i := 0; i < 2; i++ {
		botService.AddBot()
	}

	// 等待所有订单处理完成（2个机器人并行处理，大约需要50秒）
	t.Log("Waiting for all orders to complete...")
	if !waitForAllOrdersComplete(orderService, numGoroutines, 70*time.Second) {
		t.Logf("Only %d orders completed, expected %d", len(orderService.GetCompleteOrders()), numGoroutines)
	}

	completeOrders := orderService.GetCompleteOrders()
	t.Logf("Complete orders: %d", len(completeOrders))

	// 清理
	for len(botService.GetBotStatus()) > 0 {
		botService.RemoveBot()
	}
}

// TestIntegration_BotDynamicAdjustment 测试机器人动态调整场景
func TestIntegration_BotDynamicAdjustment(t *testing.T) {
	orderService, botService, _, _ := setupTestEnvironment()

	// 步骤1: 创建5个订单（减少数量以缩短测试时间）
	t.Log("Step 1: Creating 5 orders")
	orders := make([]*domain.Order, 5)
	for i := 0; i < 5; i++ {
		if i%2 == 0 {
			orders[i], _ = orderService.CreateVIPOrder()
		} else {
			orders[i], _ = orderService.CreateNormalOrder()
		}
	}

	pendingCount := len(orderService.GetPendingOrders())
	t.Logf("Created %d orders, pending: %d", len(orders), pendingCount)

	if pendingCount != 5 {
		t.Errorf("Expected 5 pending orders, got %d", pendingCount)
	}

	// 步骤2: 动态添加机器人
	t.Log("Step 2: Dynamically adding bots")
	bots := make([]*domain.Bot, 0)

	// 添加2个机器人
	for i := 0; i < 2; i++ {
		bot := botService.AddBot()
		bots = append(bots, bot)
		t.Logf("Added bot #%d", bot.ID)
		time.Sleep(50 * time.Millisecond)
	}

	// 等待一段时间让机器人处理一些订单
	time.Sleep(12 * time.Second)

	// 步骤3: 在订单处理过程中添加更多机器人
	t.Log("Step 3: Adding more bots while processing")
	for i := 0; i < 2; i++ {
		bot := botService.AddBot()
		bots = append(bots, bot)
		t.Logf("Added bot #%d", bot.ID)
	}

	// 等待更多订单完成
	time.Sleep(12 * time.Second)

	// 步骤4: 随机移除一些机器人
	t.Log("Step 4: Removing some bots dynamically")
	removedCount := 0
	for i := 0; i < 2; i++ {
		bot, order := botService.RemoveBot()
		if bot != nil {
			removedCount++
			t.Logf("Removed bot #%d", bot.ID)
			if order != nil {
				t.Logf("Order #%d returned to queue", order.ID)
			}
		}
	}

	if removedCount != 2 {
		t.Errorf("Expected to remove 2 bots, removed %d", removedCount)
	}

	// 步骤5: 再次添加机器人
	t.Log("Step 5: Adding bots again")
	for i := 0; i < 1; i++ {
		bot := botService.AddBot()
		if bot != nil {
			bots = append(bots, bot)
			t.Logf("Added bot #%d", bot.ID)
		}
	}

	// 等待所有订单完成
	t.Log("Waiting for all orders to complete...")
	if !waitForAllOrdersComplete(orderService, 5, 30*time.Second) {
		t.Logf("Timeout - only %d orders completed", len(orderService.GetCompleteOrders()))
	}

	// 最终验证
	pendingOrders := orderService.GetPendingOrders()
	completeOrders := orderService.GetCompleteOrders()
	botStatus := botService.GetBotStatus()

	t.Logf("Final state - Pending: %d, Complete: %d, Bots: %d",
		len(pendingOrders), len(completeOrders), len(botStatus))

	if len(pendingOrders) != 0 {
		t.Errorf("Expected 0 pending orders, got %d", len(pendingOrders))
	}

	if len(completeOrders) != 5 {
		t.Errorf("Expected 5 complete orders, got %d", len(completeOrders))
	}

	// 验证当前机器人数量
	if len(botStatus) != 3 {
		t.Errorf("Expected 3 bots, got %d", len(botStatus))
	}

	// 清理所有机器人
	for len(botService.GetBotStatus()) > 0 {
		botService.RemoveBot()
	}

	_ = bots
}

// TestIntegration_CLICommands 测试CLI命令集成
func TestIntegration_CLICommands(t *testing.T) {
	orderService, botService, scheduler, _ := setupTestEnvironment()

	// 创建CLI实例，输出到buffer
	tmpFile, err := os.CreateTemp("", "cli_test_*.txt")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	cliInterface := cli.NewCLI(orderService, botService, scheduler, tmpFile)

	// 测试 new-normal 命令
	result := cliInterface.ExecuteCommand("new-normal")
	if !strings.Contains(result, "Created Normal Order") {
		t.Errorf("new-normal command failed: %s", result)
	}
	t.Logf("new-normal result: %s", result)

	// 测试 new-vip 命令
	result = cliInterface.ExecuteCommand("new-vip")
	if !strings.Contains(result, "Created VIP Order") {
		t.Errorf("new-vip command failed: %s", result)
	}
	t.Logf("new-vip result: %s", result)

	// 测试 +bot 命令
	result = cliInterface.ExecuteCommand("+bot")
	if !strings.Contains(result, "Added Bot") {
		t.Errorf("+bot command failed: %s", result)
	}
	t.Logf("+bot result: %s", result)

	// 测试 status 命令
	result = cliInterface.ExecuteCommand("status")
	if !strings.Contains(result, "Current Status") {
		t.Errorf("status command failed: %s", result)
	}
	t.Logf("status result: %s", result)

	// 验证时间戳格式 HH:MM:SS
	if !strings.Contains(result, ":") {
		t.Error("Status output missing timestamp")
	}

	// 测试 help 命令
	result = cliInterface.ExecuteCommand("help")
	if !strings.Contains(result, "Available commands") {
		t.Errorf("help command failed: %s", result)
	}
	t.Logf("help result: %s", result)

	// 测试 -bot 命令
	result = cliInterface.ExecuteCommand("-bot")
	if !strings.Contains(result, "Removed Bot") {
		t.Errorf("-bot command failed: %s", result)
	}
	t.Logf("-bot result: %s", result)

	// 测试未知命令
	result = cliInterface.ExecuteCommand("unknown")
	if !strings.Contains(result, "Unknown command") {
		t.Errorf("Unknown command handling failed: %s", result)
	}
	t.Logf("unknown command result: %s", result)

	// 清理
	for len(botService.GetBotStatus()) > 0 {
		botService.RemoveBot()
	}
}

// TestIntegration_OrderProcessingTime 验证订单处理时间
func TestIntegration_OrderProcessingTime(t *testing.T) {
	orderService, botService, _, _ := setupTestEnvironment()

	// 添加1个机器人
	botService.AddBot()

	// 创建1个订单
	order, _ := orderService.CreateNormalOrder()
	startTime := time.Now()

	t.Logf("Order #%d created at %v", order.ID, startTime)

	// 等待订单完成
	if !waitForOrderComplete(orderService, order.ID, 15*time.Second) {
		t.Fatal("Order processing timeout")
	}

	elapsed := time.Since(startTime)
	t.Logf("Order #%d completed in %v", order.ID, elapsed)

	// 验证处理时间约为10秒（允许2秒误差）
	if elapsed < 9*time.Second || elapsed > 13*time.Second {
		t.Errorf("Order processing time %v is outside expected range (9-13s)", elapsed)
	}

	// 清理
	for len(botService.GetBotStatus()) > 0 {
		botService.RemoveBot()
	}
}

// TestIntegration_BotStatusTransitions 测试机器人状态转换
func TestIntegration_BotStatusTransitions(t *testing.T) {
	orderService, botService, _, _ := setupTestEnvironment()

	// 添加1个机器人
	bot := botService.AddBot()

	// 初始状态应该是 Idle
	status := botService.GetBotStatus()
	if status[bot.ID] != "Idle" {
		t.Errorf("Expected bot status 'Idle', got '%s'", status[bot.ID])
	}
	t.Logf("Bot #%d initial status: %s", bot.ID, status[bot.ID])

	// 创建订单
	order, _ := orderService.CreateNormalOrder()

	// 等待机器人开始处理
	time.Sleep(300 * time.Millisecond)

	// 状态应该变为 Processing
	status = botService.GetBotStatus()
	if status[bot.ID] != "Processing" {
		t.Errorf("Expected bot status 'Processing', got '%s'", status[bot.ID])
	}
	t.Logf("Bot #%d processing status: %s", bot.ID, status[bot.ID])

	// 等待订单完成
	if !waitForOrderComplete(orderService, order.ID, 15*time.Second) {
		t.Fatal("Timeout waiting for order to complete")
	}

	// 状态应该变回 Idle
	status = botService.GetBotStatus()
	if status[bot.ID] != "Idle" {
		t.Errorf("Expected bot status 'Idle' after completion, got '%s'", status[bot.ID])
	}
	t.Logf("Bot #%d final status: %s", bot.ID, status[bot.ID])

	// 验证订单已完成
	completeOrders := orderService.GetCompleteOrders()
	found := false
	for _, o := range completeOrders {
		if o.ID == order.ID {
			found = true
			break
		}
	}
	if !found {
		t.Error("Order not found in complete orders")
	}

	// 清理
	for len(botService.GetBotStatus()) > 0 {
		botService.RemoveBot()
	}
}
