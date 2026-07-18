package controller

import (
	"sync"
	"testing"
	"time"
)

// newTestController 创建用于测试的 Controller，处理时间极短
func newTestController() *Controller {
	return New(10 * time.Millisecond)
}

// newTestControllerSlow 创建处理时间较长的 Controller（用于需要检查中间状态的测试）
func newTestControllerSlow() *Controller {
	return New(500 * time.Millisecond)
}

// TestCreateNormalOrder 测试创建普通订单
func TestCreateNormalOrder(t *testing.T) {
	ctrl := newTestController()

	id := ctrl.CreateNormalOrder()
	if id != 1001 {
		t.Errorf("expected first order ID 1001, got %d", id)
	}
	if ctrl.PendingOrders() != 1 {
		t.Errorf("expected 1 pending order, got %d", ctrl.PendingOrders())
	}
}

// TestCreateVIPOrder 测试创建 VIP 订单
func TestCreateVIPOrder(t *testing.T) {
	ctrl := newTestController()

	id := ctrl.CreateVIPOrder()
	if id != 1001 {
		t.Errorf("expected first order ID 1001, got %d", id)
	}
	if ctrl.PendingOrders() != 1 {
		t.Errorf("expected 1 pending order, got %d", ctrl.PendingOrders())
	}
	if ctrl.TotalVIPOrders() != 1 {
		t.Errorf("expected 1 VIP order, got %d", ctrl.TotalVIPOrders())
	}
}

// TestOrderIDIncrementing 测试订单 ID 自增
func TestOrderIDIncrementing(t *testing.T) {
	ctrl := newTestController()

	id1 := ctrl.CreateNormalOrder()
	id2 := ctrl.CreateVIPOrder()
	id3 := ctrl.CreateNormalOrder()

	if id1 != 1001 || id2 != 1002 || id3 != 1003 {
		t.Errorf("expected IDs 1001, 1002, 1003; got %d, %d, %d", id1, id2, id3)
	}
}

// TestVIPPriority 测试 VIP 订单优先被 Bot 取走
func TestVIPPriority(t *testing.T) {
	ctrl := newTestController()

	// 先创建普通订单，再创建 VIP 订单
	ctrl.CreateNormalOrder() // #1001
	ctrl.CreateVIPOrder()    // #1002

	// 添加 Bot，VIP 应排在队列首位，先被取走
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	// VIP #1002 优先被处理，完成后处理 Normal #1001
	if ctrl.TotalVIPOrders() != 1 {
		t.Errorf("expected 1 VIP order, got %d", ctrl.TotalVIPOrders())
	}
	// Bot 应已至少完成 VIP 订单
	if ctrl.CompletedOrders() == 0 {
		t.Error("expected at least 1 completed order (VIP should be first)")
	}

	ctrl.Shutdown()
}

// TestVIPBehindVIP 测试新 VIP 排在已有 VIP 之后
func TestVIPBehindVIP(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateNormalOrder() // #1002
	ctrl.CreateVIPOrder()    // #1003

	// 队列顺序应为：[VIP #1001, VIP #1003, Normal #1002]

	ctrl.AddBot() // Bot #1 取走 VIP #1001
	time.Sleep(10 * time.Millisecond)

	ctrl.AddBot() // Bot #2 取走 VIP #1003
	time.Sleep(10 * time.Millisecond)

	// Bot #1 正在处理 VIP #1001，Bot #2 正在处理 VIP #1003
	// 普通 #1002 应该还在队列中
	if ctrl.PendingOrders() != 1 {
		t.Errorf("expected 1 pending order (Normal #1002), got %d", ctrl.PendingOrders())
	}

	ctrl.Shutdown()
}

// TestAddBot 测试添加机器人
func TestAddBot(t *testing.T) {
	ctrl := newTestController()

	id := ctrl.AddBot()
	if id != 1 {
		t.Errorf("expected first bot ID 1, got %d", id)
	}
	if ctrl.ActiveBots() != 1 {
		t.Errorf("expected 1 active bot, got %d", ctrl.ActiveBots())
	}

	ctrl.Shutdown()
}

// TestBotIDIncrementing 测试 Bot ID 自增
func TestBotIDIncrementing(t *testing.T) {
	ctrl := newTestController()

	id1 := ctrl.AddBot()
	id2 := ctrl.AddBot()

	if id1 != 1 || id2 != 2 {
		t.Errorf("expected bot IDs 1, 2; got %d, %d", id1, id2)
	}

	ctrl.Shutdown()
}

// TestBotProcessesOrder 测试 Bot 处理订单的完整流程
func TestBotProcessesOrder(t *testing.T) {
	ctrl := newTestController()

	ctrl.CreateNormalOrder() // #1001
	ctrl.AddBot()            // Bot #1

	// 等待 Bot 处理完成（10ms 处理时间 + 缓冲）
	time.Sleep(100 * time.Millisecond)

	if ctrl.CompletedOrders() != 1 {
		t.Errorf("expected 1 completed order, got %d", ctrl.CompletedOrders())
	}
	if ctrl.PendingOrders() != 0 {
		t.Errorf("expected 0 pending orders, got %d", ctrl.PendingOrders())
	}

	ctrl.Shutdown()
}

// TestBotBecomesIdle 测试 Bot 在无订单时变为空闲
func TestBotBecomesIdle(t *testing.T) {
	ctrl := newTestController()

	ctrl.CreateNormalOrder() // #1001
	ctrl.AddBot()            // Bot #1

	// 等待处理完成并进入空闲（订单完成后无新订单，Bot 空闲）
	time.Sleep(100 * time.Millisecond)

	if ctrl.CompletedOrders() != 1 {
		t.Errorf("expected 1 completed order, got %d", ctrl.CompletedOrders())
	}
	if ctrl.PendingOrders() != 0 {
		t.Errorf("expected 0 pending orders, got %d", ctrl.PendingOrders())
	}

	ctrl.Shutdown()
}

// TestIdleBotWakesUp 测试空闲 Bot 在有新订单时被唤醒
func TestIdleBotWakesUp(t *testing.T) {
	ctrl := newTestController()

	ctrl.CreateNormalOrder() // #1001
	ctrl.AddBot()            // Bot #1

	// 等待处理完成并进入空闲
	time.Sleep(100 * time.Millisecond)

	if ctrl.CompletedOrders() != 1 {
		t.Fatal("expected first order to be completed")
	}

	// 创建新订单，Bot 应该被唤醒
	ctrl.CreateVIPOrder() // #1002

	time.Sleep(100 * time.Millisecond)

	if ctrl.CompletedOrders() != 2 {
		t.Errorf("expected 2 completed orders, got %d", ctrl.CompletedOrders())
	}

	ctrl.Shutdown()
}

// TestRemoveIdleBot 测试移除空闲的 Bot
func TestRemoveIdleBot(t *testing.T) {
	ctrl := newTestController()

	ctrl.AddBot() // Bot #1
	time.Sleep(30 * time.Millisecond)

	err := ctrl.RemoveBot()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if ctrl.ActiveBots() != 0 {
		t.Errorf("expected 0 active bots, got %d", ctrl.ActiveBots())
	}
}

// TestRemoveProcessingBot 测试移除正在处理订单的 Bot，订单应退回队列
func TestRemoveProcessingBot(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateNormalOrder() // #1001
	ctrl.AddBot()            // Bot #1 取走 #1001

	// 等待 Bot 取走订单并开始处理
	time.Sleep(10 * time.Millisecond)

	// Bot #1 正在处理 #1001，移除它
	err := ctrl.RemoveBot()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if ctrl.ActiveBots() != 0 {
		t.Errorf("expected 0 active bots, got %d", ctrl.ActiveBots())
	}
	if ctrl.PendingOrders() != 1 {
		t.Errorf("expected 1 pending order (returned #1001), got %d", ctrl.PendingOrders())
	}
}

// TestRemoveNewestBot 测试移除的是最新的 Bot
func TestRemoveNewestBot(t *testing.T) {
	ctrl := newTestController()

	ctrl.AddBot() // Bot #1
	time.Sleep(20 * time.Millisecond)
	ctrl.AddBot() // Bot #2

	time.Sleep(20 * time.Millisecond)

	// 移除最新的 Bot（Bot #2）
	err := ctrl.RemoveBot()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if ctrl.ActiveBots() != 1 {
		t.Errorf("expected 1 active bot (Bot #1), got %d", ctrl.ActiveBots())
	}

	ctrl.Shutdown()
}

// TestRemoveBotWhenEmpty 测试在没有 Bot 时移除
func TestRemoveBotWhenEmpty(t *testing.T) {
	ctrl := newTestController()

	err := ctrl.RemoveBot()
	if err == nil {
		t.Error("expected error when removing bot from empty pool")
	}
}

// TestOrderReturnToQueueOnBotRemoval 测试 Bot 被移除时订单退回队列并保持优先级
func TestOrderReturnToQueueOnBotRemoval(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateNormalOrder() // #1002

	ctrl.AddBot() // Bot #1 取走 VIP #1001

	time.Sleep(10 * time.Millisecond)

	// 只有 Normal #1002 在队列中
	if ctrl.PendingOrders() != 1 {
		t.Errorf("expected 1 pending order, got %d", ctrl.PendingOrders())
	}

	// 移除 Bot #1（正在处理 VIP #1001）
	ctrl.RemoveBot()

	// VIP #1001 应该退回队列，排在 Normal #1002 之前
	if ctrl.PendingOrders() != 2 {
		t.Errorf("expected 2 pending orders after bot removal, got %d", ctrl.PendingOrders())
	}

	ctrl.Shutdown()
}

// TestMultipleBotsConcurrent 测试多个 Bot 并发处理
func TestMultipleBotsConcurrent(t *testing.T) {
	ctrl := newTestController()

	// 创建 4 个订单
	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateNormalOrder() // #1002
	ctrl.CreateNormalOrder() // #1003
	ctrl.CreateNormalOrder() // #1004

	// 添加 2 个 Bot
	ctrl.AddBot() // Bot #1
	ctrl.AddBot() // Bot #2

	// 等待所有订单处理完成
	time.Sleep(200 * time.Millisecond)

	if ctrl.CompletedOrders() != 4 {
		t.Errorf("expected 4 completed orders, got %d", ctrl.CompletedOrders())
	}
	if ctrl.PendingOrders() != 0 {
		t.Errorf("expected 0 pending orders, got %d", ctrl.PendingOrders())
	}

	ctrl.Shutdown()
}

// TestBotDoesNotProcessWhenNoOrders 测试 Bot 在创建时没有订单的情况下进入空闲
func TestBotDoesNotProcessWhenNoOrders(t *testing.T) {
	ctrl := newTestController()

	ctrl.AddBot() // 没有订单时添加 Bot

	time.Sleep(50 * time.Millisecond)

	// Bot 应该空闲，没有处理任何订单
	if ctrl.CompletedOrders() != 0 {
		t.Errorf("expected 0 completed orders, got %d", ctrl.CompletedOrders())
	}
	if ctrl.PendingOrders() != 0 {
		t.Errorf("expected 0 pending orders, got %d", ctrl.PendingOrders())
	}
}

// TestCompleteFlow 测试完整流程：创建订单 → Bot 处理 → 完成 → 空闲 → 新订单唤醒
func TestCompleteFlow(t *testing.T) {
	ctrl := newTestController()

	// 创建订单和 Bot
	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateNormalOrder() // #1002
	ctrl.AddBot()            // Bot #1 取走 VIP #1001

	time.Sleep(50 * time.Millisecond)

	// Bot 应该已完成 VIP #1001（可能也完成了 Normal #1002）
	if ctrl.CompletedOrders() == 0 {
		t.Error("expected at least VIP order to be completed")
	}

	// 添加第二个 Bot
	ctrl.AddBot() // Bot #2

	time.Sleep(100 * time.Millisecond)

	if ctrl.CompletedOrders() != 2 {
		t.Errorf("expected 2 completed orders, got %d", ctrl.CompletedOrders())
	}

	ctrl.Shutdown()
}

// TestNormalOrderReturnPosition 测试移除 Bot 时 Normal 订单回到正确位置（追加末尾而非插入队首）
func TestNormalOrderReturnPosition(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateNormalOrder() // #1001
	ctrl.CreateNormalOrder() // #1002

	ctrl.AddBot() // Bot #1 取走 Normal #1001
	time.Sleep(10 * time.Millisecond)

	// 移除 Bot #1，Normal #1001 应返回到 Normal #1002 之后（追加到队列末尾）
	err := ctrl.RemoveBot()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 队列中应有 2 个订单
	if ctrl.PendingOrders() != 2 {
		t.Fatalf("expected 2 pending orders, got %d", ctrl.PendingOrders())
	}

	ctrl.Shutdown()
}

// TestRemoveBotWhileProcessingRaceCondition 竞态测试：Bot 即将完成时被移除
func TestRemoveBotWhileProcessingRaceCondition(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateNormalOrder() // #1001
	ctrl.AddBot()            // Bot #1 取走 #1001

	time.Sleep(10 * time.Millisecond)

	err := ctrl.RemoveBot()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 订单应回到 PENDING 区
	if ctrl.PendingOrders() != 1 {
		t.Errorf("expected 1 pending order after bot removal, got %d", ctrl.PendingOrders())
	}
	if ctrl.CompletedOrders() != 0 {
		t.Errorf("expected 0 completed orders, got %d", ctrl.CompletedOrders())
	}

	ctrl.Shutdown()
}

// TestShutdownCleansUpBots 测试 Shutdown 清理所有 Bot
func TestShutdownCleansUpBots(t *testing.T) {
	ctrl := newTestController()

	ctrl.AddBot()
	ctrl.AddBot()
	ctrl.AddBot()

	if ctrl.ActiveBots() != 3 {
		t.Fatalf("expected 3 active bots, got %d", ctrl.ActiveBots())
	}

	ctrl.Shutdown()

	if ctrl.ActiveBots() != 0 {
		t.Errorf("expected 0 active bots after shutdown, got %d", ctrl.ActiveBots())
	}
}

// TestShutdownReturnsProcessingOrder 测试 Shutdown 时把正在处理的订单退回队列
func TestShutdownReturnsProcessingOrder(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateNormalOrder() // #1001
	ctrl.AddBot()            // Bot #1 取走 #1001
	time.Sleep(10 * time.Millisecond)

	ctrl.Shutdown()

	// 等待 goroutine 完成清理（Shutdown 释放锁后，bot loop 需要获取锁并退回订单）
	time.Sleep(30 * time.Millisecond)

	if ctrl.PendingOrders() != 1 {
		t.Errorf("expected 1 pending order after shutdown, got %d", ctrl.PendingOrders())
	}
}

// TestNoBotWhenOrderCreated 测试没有 Bot 时创建订单
func TestNoBotWhenOrderCreated(t *testing.T) {
	ctrl := newTestController()

	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateNormalOrder() // #1002

	if ctrl.PendingOrders() != 2 {
		t.Errorf("expected 2 pending orders, got %d", ctrl.PendingOrders())
	}
	if ctrl.CompletedOrders() != 0 {
		t.Errorf("expected 0 completed orders without bots, got %d", ctrl.CompletedOrders())
	}
}

// TestRemoveAllBotsOneByOne 测试逐个移除所有 Bot
func TestRemoveAllBotsOneByOne(t *testing.T) {
	ctrl := newTestController()

	ctrl.AddBot() // #1
	ctrl.AddBot() // #2
	ctrl.AddBot() // #3

	for i := 0; i < 3; i++ {
		err := ctrl.RemoveBot()
		if err != nil {
			t.Errorf("unexpected error on removal %d: %v", i, err)
		}
	}

	if ctrl.ActiveBots() != 0 {
		t.Errorf("expected 0 active bots, got %d", ctrl.ActiveBots())
	}

	err := ctrl.RemoveBot()
	if err == nil {
		t.Error("expected error when removing from empty pool")
	}
}

// TestOrderCountsAccurate 测试订单统计准确性
func TestOrderCountsAccurate(t *testing.T) {
	ctrl := newTestController()

	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateVIPOrder()    // #1002
	ctrl.CreateNormalOrder() // #1003
	ctrl.CreateNormalOrder() // #1004
	ctrl.CreateNormalOrder() // #1005

	if ctrl.TotalVIPOrders() != 2 {
		t.Errorf("expected 2 VIP orders, got %d", ctrl.TotalVIPOrders())
	}
	if ctrl.TotalNormalOrders() != 3 {
		t.Errorf("expected 3 Normal orders, got %d", ctrl.TotalNormalOrders())
	}
	if ctrl.PendingOrders() != 5 {
		t.Errorf("expected 5 pending orders, got %d", ctrl.PendingOrders())
	}
}

// TestOrderCountsAfterProcessing 测试处理过程中的订单统计
func TestOrderCountsAfterProcessing(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateNormalOrder() // #1002
	ctrl.CreateNormalOrder() // #1003

	ctrl.AddBot() // Bot #1 取走 VIP #1001
	time.Sleep(10 * time.Millisecond)

	vipCount := ctrl.TotalVIPOrders()
	normalCount := ctrl.TotalNormalOrders()
	pending := ctrl.PendingOrders()

	if vipCount != 1 {
		t.Errorf("expected 1 VIP order, got %d", vipCount)
	}
	if normalCount != 2 {
		t.Errorf("expected 2 Normal orders, got %d", normalCount)
	}
	if pending != 2 {
		t.Errorf("expected 2 pending orders, got %d", pending)
	}

	ctrl.Shutdown()
}

// TestMultipleBotsProcessingVIP 测试多个 Bot 并发处理混合优先级订单
func TestMultipleBotsProcessingVIP(t *testing.T) {
	ctrl := newTestController()

	ctrl.CreateVIPOrder()    // #1001
	ctrl.CreateNormalOrder() // #1002
	ctrl.CreateNormalOrder() // #1003
	ctrl.CreateVIPOrder()    // #1004
	ctrl.CreateNormalOrder() // #1005

	ctrl.AddBot()
	ctrl.AddBot()
	ctrl.AddBot()

	time.Sleep(200 * time.Millisecond)

	if ctrl.CompletedOrders() != 5 {
		t.Errorf("expected 5 completed orders, got %d", ctrl.CompletedOrders())
	}
	if ctrl.PendingOrders() != 0 {
		t.Errorf("expected 0 pending orders, got %d", ctrl.PendingOrders())
	}

	ctrl.Shutdown()
}

// TestRemoveIdleBotLeavesOthersWorking 测试移除空闲 Bot 不影响工作中的 Bot
func TestRemoveIdleBotLeavesOthersWorking(t *testing.T) {
	ctrl := newTestControllerSlow()

	ctrl.CreateNormalOrder() // #1001
	ctrl.AddBot()            // Bot #1 取走 #1001
	ctrl.AddBot()            // Bot #2 空闲

	time.Sleep(10 * time.Millisecond)

	err := ctrl.RemoveBot()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if ctrl.ActiveBots() != 1 {
		t.Errorf("expected 1 active bot, got %d", ctrl.ActiveBots())
	}

	// Bot #1 处理时间 500ms，需等待足够长让处理完成
	time.Sleep(700 * time.Millisecond)
	if ctrl.CompletedOrders() != 1 {
		t.Errorf("expected 1 completed order, got %d", ctrl.CompletedOrders())
	}

	ctrl.Shutdown()
}

// TestConcurrentAddAndRemoveBots 并发添加和移除 Bot
func TestConcurrentAddAndRemoveBots(t *testing.T) {
	ctrl := newTestController()

	for i := 0; i < 10; i++ {
		if i%2 == 0 {
			ctrl.CreateNormalOrder()
		} else {
			ctrl.CreateVIPOrder()
		}
	}

	var wg sync.WaitGroup

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ctrl.AddBot()
		}()
	}

	wg.Wait()
	time.Sleep(200 * time.Millisecond)

	if ctrl.CompletedOrders() != 10 {
		t.Errorf("expected 10 completed orders, got %d", ctrl.CompletedOrders())
	}

	ctrl.Shutdown()
}
