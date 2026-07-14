package main

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func newTestController() *OrderController {
	return NewOrderController(&bytes.Buffer{}, 100*time.Millisecond)
}

// ---------- 订单创建测试 ----------

func TestAddNormalOrder(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder()
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if oc.nextOrderID != 1 {
		t.Fatalf("expected nextOrderID=1, got %d", oc.nextOrderID)
	}
	if len(oc.normalPending) != 1 {
		t.Fatalf("expected 1 normal pending, got %d", len(oc.normalPending))
	}
	if oc.normalPending[0].ID != 1 {
		t.Fatalf("expected order ID=1, got %d", oc.normalPending[0].ID)
	}
	if oc.normalPending[0].Type != OrderNormal {
		t.Fatalf("expected NORMAL type, got %s", oc.normalPending[0].Type)
	}
	if oc.normalPending[0].Status != StatusPending {
		t.Fatalf("expected PENDING status, got %s", oc.normalPending[0].Status)
	}
	if len(oc.vipPending) != 0 {
		t.Fatal("vipPending should be empty")
	}
}

func TestAddVIPOrder(t *testing.T) {
	oc := newTestController()

	oc.AddVIPOrder()
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.vipPending) != 1 {
		t.Fatalf("expected 1 vip pending, got %d", len(oc.vipPending))
	}
	if oc.vipPending[0].Type != OrderVIP {
		t.Fatalf("expected VIP type, got %s", oc.vipPending[0].Type)
	}
	if len(oc.normalPending) != 0 {
		t.Fatal("normalPending should be empty")
	}
}

func TestOrderNumberUniqueAndIncreasing(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // ID 1
	oc.AddVIPOrder()    // ID 2
	oc.AddNormalOrder() // ID 3
	oc.AddVIPOrder()    // ID 4

	oc.mu.Lock()
	defer oc.mu.Unlock()

	ids := make(map[int]bool)
	for _, o := range oc.normalPending {
		if ids[o.ID] {
			t.Fatalf("duplicate order ID: %d", o.ID)
		}
		ids[o.ID] = true
	}
	for _, o := range oc.vipPending {
		if ids[o.ID] {
			t.Fatalf("duplicate order ID: %d", o.ID)
		}
		ids[o.ID] = true
	}

	if !ids[1] || !ids[2] || !ids[3] || !ids[4] {
		t.Fatal("expected IDs 1,2,3,4 all present")
	}
}

// ---------- VIP 优先级测试 ----------

func TestVIPPriority(t *testing.T) {
	oc := newTestController()

	// 创建混合订单
	oc.AddNormalOrder() // #1
	oc.AddVIPOrder()    // #2
	oc.AddNormalOrder() // #3
	oc.AddVIPOrder()    // #4
	oc.AddNormalOrder() // #5

	// 添加机器人，观察其取单行为
	oc.AddBot()
	time.Sleep(50 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	// 机器人应先取第一个 VIP（#2），而非第一个 Normal（#1）
	if len(oc.vipPending) != 1 {
		t.Fatalf("expected 1 vip pending, got %d", len(oc.vipPending))
	}
	if oc.vipPending[0].ID != 4 {
		t.Fatalf("expected remaining VIP order ID=4, got %d", oc.vipPending[0].ID)
	}
	// Normal 订单应保持不动
	if len(oc.normalPending) != 3 {
		t.Fatalf("expected 3 normal pending, got %d", len(oc.normalPending))
	}
}

func TestBotPicksVIPBeforeNormal(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1
	oc.AddVIPOrder()    // #2
	oc.AddBot()

	time.Sleep(150 * time.Millisecond) // wait for processing to complete

	oc.mu.Lock()
	defer oc.mu.Unlock()

	// VIP 已完成，Normal 仍在等待
	if len(oc.completed) != 1 {
		t.Fatalf("expected 1 completed, got %d", len(oc.completed))
	}
	if oc.completed[0].ID != 2 || oc.completed[0].Type != OrderVIP {
		t.Fatalf("expected VIP #2 completed first, got ID=%d Type=%s", oc.completed[0].ID, oc.completed[0].Type)
	}
	// 机器人在完成 VIP #2 后应取 Normal #1
	if len(oc.normalPending) != 0 {
		t.Fatalf("expected 0 normal pending (bot should pick it), got %d", len(oc.normalPending))
	}
}

// ---------- 机器人生命周期测试 ----------

func TestAddBot(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1（需要有订单让机器人显示 ACTIVE）
	oc.AddBot()

	time.Sleep(50 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) != 1 {
		t.Fatalf("expected 1 bot, got %d", len(oc.bots))
	}
	if oc.bots[0].ID != 1 {
		t.Fatalf("expected bot ID=1, got %d", oc.bots[0].ID)
	}
	if oc.bots[0].Status != BotProcessing {
		t.Fatalf("expected bot PROCESSING, got %s", oc.bots[0].Status)
	}
}

func TestBotProcessingCompletesOrder(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1
	oc.AddBot()

	// 等待处理完成
	time.Sleep(200 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.completed) != 1 {
		t.Fatalf("expected 1 completed, got %d", len(oc.completed))
	}
	if oc.completed[0].Status != StatusComplete {
		t.Fatalf("expected COMPLETE status, got %s", oc.completed[0].Status)
	}
	if oc.bots[0].Status != BotIdle {
		t.Fatalf("expected bot IDLE after completion, got %s", oc.bots[0].Status)
	}
}

func TestBotContinuesAfterCompletion(t *testing.T) {
	oc := newTestController()

	oc.AddVIPOrder()    // #1
	oc.AddNormalOrder() // #2
	oc.AddBot()

	// 等待两个订单完成（2 × 100ms）
	time.Sleep(300 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.completed) != 2 {
		t.Fatalf("expected 2 completed, got %d", len(oc.completed))
	}
	if oc.completed[0].ID != 1 || oc.completed[1].ID != 2 {
		t.Fatalf("expected orders #1,#2 completed in order")
	}
}

func TestBotBecomesIdleWhenNoOrders(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1
	oc.AddBot()

	// 等待处理完成
	time.Sleep(200 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) != 1 {
		t.Fatal("expected 1 bot")
	}
	if oc.bots[0].Status != BotIdle {
		t.Fatalf("expected bot IDLE, got %s", oc.bots[0].Status)
	}
}

func TestBotWakesOnNewOrder(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1
	oc.AddBot()

	// 等待机器人完成并进入空闲状态
	time.Sleep(200 * time.Millisecond)

	// 新增订单 — 空闲机器人应取单
	oc.AddNormalOrder() // #2

	// 等待处理完成
	time.Sleep(200 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.completed) != 2 {
		t.Fatalf("expected 2 completed, got %d", len(oc.completed))
	}
}

// ---------- 移除机器人测试 ----------

func TestRemoveBotIdle(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1
	oc.AddBot()

	// Wait for bot to complete and go idle
	time.Sleep(200 * time.Millisecond)

	// 移除空闲机器人
	oc.RemoveNewestBot()
	time.Sleep(100 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) != 0 {
		t.Fatalf("expected 0 bots, got %d", len(oc.bots))
	}
}

func TestRemoveBotProcessingReturnsOrder(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1
	oc.AddBot()

	// 给机器人时间取单
	time.Sleep(50 * time.Millisecond)

	// 移除正在处理的机器人
	oc.RemoveNewestBot()
	time.Sleep(150 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	// 机器人应已删除
	if len(oc.bots) != 0 {
		t.Fatalf("expected 0 bots, got %d", len(oc.bots))
	}
	// 订单应回归 normalPending
	if len(oc.normalPending) != 1 {
		t.Fatalf("expected 1 normal pending (returned order), got %d", len(oc.normalPending))
	}
	if oc.normalPending[0].ID != 1 {
		t.Fatalf("expected returned order ID=1, got %d", oc.normalPending[0].ID)
	}
	if oc.normalPending[0].Status != StatusPending {
		t.Fatalf("expected PENDING status, got %s", oc.normalPending[0].Status)
	}
}

func TestRemoveBotReturnsOrderOriginalPosition(t *testing.T) {
	// 使用较长处理时间，确保测试期间订单不会完成
	oc := NewOrderController(&bytes.Buffer{}, 500*time.Millisecond)

	oc.AddNormalOrder() // #1
	oc.AddNormalOrder() // #2
	oc.AddNormalOrder() // #3

	// normalPending = [#1, #2, #3]

	// 添加 Bot #1 → 取 #1
	oc.AddBot()
	time.Sleep(30 * time.Millisecond)

	// 添加 Bot #2 → 取 #2
	oc.AddBot()
	time.Sleep(30 * time.Millisecond)

	// normalPending = [#3]

	// 移除 Bot #2（最新，处理中 #2）→ #2 回归
	oc.RemoveNewestBot()
	time.Sleep(100 * time.Millisecond)

	// 移除 Bot #1（当前最新，处理中 #1）→ #1 按 ID 顺序回归
	oc.RemoveNewestBot()
	time.Sleep(100 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	// 应恢复为：[#1, #2, #3] — 按 ID 升序回归
	if len(oc.normalPending) != 3 {
		t.Fatalf("expected 3 normal pending, got %d", len(oc.normalPending))
	}
	if oc.normalPending[0].ID != 1 {
		t.Fatalf("expected order #1 at position 0, got #%d", oc.normalPending[0].ID)
	}
	if oc.normalPending[1].ID != 2 {
		t.Fatalf("expected order #2 at position 1, got #%d", oc.normalPending[1].ID)
	}
	if oc.normalPending[2].ID != 3 {
		t.Fatalf("expected order #3 at position 2, got #%d", oc.normalPending[2].ID)
	}
}

func TestRemoveBotReturnsOrderMaintainsVIPPriority(t *testing.T) {
	oc := newTestController()

	oc.AddVIPOrder()    // #1
	oc.AddNormalOrder() // #2
	oc.AddVIPOrder()    // #3

	// vipPending=[#1,#3], normalPending=[#2]

	// 添加 Bot #1 → 取 VIP #1
	oc.AddBot()
	time.Sleep(50 * time.Millisecond)

	// vipPending=[#3], normalPending=[#2]

	// 移除 Bot #1 → VIP #1 按 ID 顺序回归 vipPending
	oc.RemoveNewestBot()
	time.Sleep(150 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	// VIP #1 应回到 vipPending，按 ID 排序
	if len(oc.vipPending) != 2 {
		t.Fatalf("expected 2 vip pending, got %d", len(oc.vipPending))
	}
	if oc.vipPending[0].ID != 1 || oc.vipPending[1].ID != 3 {
		t.Fatalf("expected vipPending=[#1,#3], got [%d,%d]", oc.vipPending[0].ID, oc.vipPending[1].ID)
	}
	// Normal 应保持不变
	if len(oc.normalPending) != 1 || oc.normalPending[0].ID != 2 {
		t.Fatalf("expected normalPending=[#2], got [%d]", oc.normalPending[0].ID)
	}
}

// ---------- 多机器人测试 ----------

func TestMultipleBotsConcurrent(t *testing.T) {
	oc := newTestController()

	oc.AddVIPOrder()    // #1
	oc.AddNormalOrder() // #2
	oc.AddVIPOrder()    // #3
	oc.AddNormalOrder() // #4

	oc.AddBot()
	oc.AddBot()

	// 等待全部完成
	time.Sleep(400 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.completed) != 4 {
		t.Fatalf("expected 4 completed, got %d", len(oc.completed))
	}
	// 机器人应处于空闲状态
	for _, b := range oc.bots {
		if b.Status != BotIdle {
			t.Fatalf("expected bot IDLE, got %s", b.Status)
		}
	}
}

// ---------- 输出格式测试 ----------

func TestOutputContainsTimestamp(t *testing.T) {
	var buf bytes.Buffer
	oc := NewOrderController(&buf, 10*time.Millisecond)

	oc.AddNormalOrder()
	oc.AddBot()
	oc.WaitForIdle()

	output := buf.String()
	if !strings.Contains(output, "[") || !strings.Contains(output, "]") {
		t.Fatal("output should contain timestamp in brackets")
	}
}

func TestOutputContainsRequiredKeywords(t *testing.T) {
	var buf bytes.Buffer
	oc := NewOrderController(&buf, 10*time.Millisecond)

	oc.AddNormalOrder()
	oc.AddVIPOrder()
	oc.AddBot()
	oc.WaitForIdle()

	output := buf.String()
	required := []string{"PENDING", "PROCESSING", "COMPLETE", "VIP", "Normal"}
	for _, kw := range required {
		if !strings.Contains(output, kw) {
			t.Fatalf("output should contain '%s'", kw)
		}
	}
}

// ---------- 边界情况测试 ----------

func TestRemoveBotWhenNoBots(t *testing.T) {
	oc := newTestController()
	// 不应 panic
	oc.RemoveNewestBot()

	oc.mu.Lock()
	defer oc.mu.Unlock()
	if len(oc.bots) != 0 {
		t.Fatal("should have 0 bots")
	}
}

func TestRemoveNewestBotOnly(t *testing.T) {
	oc := newTestController()

	oc.AddNormalOrder() // #1
	oc.AddNormalOrder() // #2
	oc.AddBot()         // Bot #1 picks #1
	time.Sleep(50 * time.Millisecond)
	oc.AddBot() // Bot #2 picks #2
	time.Sleep(50 * time.Millisecond)

	// Remove newest bot (#2)
	oc.RemoveNewestBot()
	time.Sleep(150 * time.Millisecond)

	oc.mu.Lock()
	defer oc.mu.Unlock()

	// Bot #1 should still exist
	if len(oc.bots) != 1 {
		t.Fatalf("expected 1 bot remaining, got %d", len(oc.bots))
	}
	if oc.bots[0].ID != 1 {
		t.Fatalf("expected Bot #1 remaining, got Bot #%d", oc.bots[0].ID)
	}
}
