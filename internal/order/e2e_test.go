package order

import (
	"testing"
	"time"
)

const e2eProcessDuration = 150 * time.Millisecond

func newE2EController() *Controller {
	return NewControllerWithConfig(Config{ProcessDuration: e2eProcessDuration})
}

func waitForProcess(t *testing.T) {
	t.Helper()
	t.Logf("等待处理完成 (~%v)...", e2eProcessDuration)
	time.Sleep(e2eProcessDuration + 80*time.Millisecond)
}

func assertIDs(t *testing.T, got, want []int) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("ids: got %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("ids: got %v, want %v", got, want)
		}
	}
	t.Logf("✓ 队列/列表 ID 符合预期: %v", got)
}

func TestE2E_NormalOrderAppearsInPending(t *testing.T) {
	ctrl := newE2EController()
	t.Log("步骤1: 创建普通订单")
	order := ctrl.CreateNormalOrder()

	t.Log("步骤2: 断言进入 PENDING")
	if ctrl.OrderStatus(order) != StatusPending {
		t.Fatalf("status=%s", ctrl.OrderStatus(order))
	}
	assertIDs(t, ctrl.PendingIDs(), []int{order.ID})
	t.Logf("✓ 需求1通过: Order #%d 在 PENDING", order.ID)
}

func TestE2E_VIPPriorityInPendingQueue(t *testing.T) {
	ctrl := newE2EController()
	t.Log("步骤1: 依次创建 Normal, VIP, Normal, VIP")
	n1 := ctrl.CreateNormalOrder()
	v1 := ctrl.CreateVIPOrder()
	n2 := ctrl.CreateNormalOrder()
	v2 := ctrl.CreateVIPOrder()

	t.Log("步骤2: 断言队列顺序为 VIP..., Normal...")
	assertIDs(t, ctrl.PendingIDs(), []int{v1.ID, v2.ID, n1.ID, n2.ID})
	t.Log("✓ 需求2通过: VIP 插在 Normal 之前")
}

func TestE2E_OrderNumbersUniqueAndIncreasing(t *testing.T) {
	ctrl := newE2EController()
	t.Log("步骤1: 连续创建 3 个订单")
	o1 := ctrl.CreateNormalOrder()
	o2 := ctrl.CreateVIPOrder()
	o3 := ctrl.CreateNormalOrder()

	t.Log("步骤2: 断言 ID 为 1,2,3")
	if o1.ID != 1 || o2.ID != 2 || o3.ID != 3 {
		t.Fatalf("ids=%d,%d,%d", o1.ID, o2.ID, o3.ID)
	}
	t.Logf("✓ 需求3通过: 订单号 %d,%d,%d 唯一递增", o1.ID, o2.ID, o3.ID)
}

func TestE2E_BotProcessesPendingThenContinues(t *testing.T) {
	ctrl := newE2EController()
	t.Log("步骤1: 创建 VIP + Normal，然后 +Bot")
	first := ctrl.CreateVIPOrder()
	second := ctrl.CreateNormalOrder()
	bot := ctrl.AddBot()
	time.Sleep(30 * time.Millisecond)

	t.Log("步骤2: 断言先处理 VIP")
	_, cur := ctrl.BotState(bot)
	if cur == nil || cur.ID != first.ID {
		t.Fatalf("should pick VIP first")
	}
	assertIDs(t, ctrl.PendingIDs(), []int{second.ID})
	t.Logf("✓ Bot 正在处理 VIP #%d，Normal #%d 仍在 PENDING", first.ID, second.ID)

	waitForProcess(t)
	t.Log("步骤3: 断言 VIP 完成，并继续处理 Normal")
	assertIDs(t, ctrl.CompletedIDs(), []int{first.ID})
	if ctrl.OrderStatus(first) != StatusComplete {
		t.Fatalf("first should be COMPLETE")
	}

	status, current := ctrl.BotState(bot)
	if status != Processing || current == nil || current.ID != second.ID {
		t.Fatalf("should continue with second order")
	}
	t.Logf("✓ VIP #%d COMPLETE，Bot 继续处理 Normal #%d", first.ID, second.ID)

	waitForProcess(t)
	assertIDs(t, ctrl.CompletedIDs(), []int{first.ID, second.ID})
	t.Log("✓ 需求4通过: 10s(测试加速)后完成并继续下一单")
}

func TestE2E_BotIdleThenResumesOnNewOrder(t *testing.T) {
	ctrl := newE2EController()
	t.Log("步骤1: 一单做完后 Bot 应变 IDLE")
	order := ctrl.CreateNormalOrder()
	bot := ctrl.AddBot()
	waitForProcess(t)

	st, _ := ctrl.BotState(bot)
	if ctrl.OrderStatus(order) != StatusComplete || st != Idle {
		t.Fatalf("bot should be IDLE after completing")
	}
	t.Logf("✓ Order #%d COMPLETE，Bot IDLE", order.ID)

	t.Log("步骤2: 新 VIP 进来，IDLE Bot 应立即接手")
	next := ctrl.CreateVIPOrder()
	time.Sleep(30 * time.Millisecond)
	st, cur := ctrl.BotState(bot)
	if st != Processing || cur == nil || cur.ID != next.ID {
		t.Fatalf("idle bot should resume on new order")
	}
	t.Logf("✓ Bot 已接手 VIP #%d", next.ID)

	waitForProcess(t)
	assertIDs(t, ctrl.CompletedIDs(), []int{order.ID, next.ID})
	t.Log("✓ 需求5通过: 空闲后遇新单自动恢复")
}

func TestE2E_RemoveBotReturnsOrderToPendingForOtherBot(t *testing.T) {
	ctrl := newE2EController()

	t.Log("步骤1: 普通单 + bot1 + bot2（bot1 先接普通单）")
	order := ctrl.CreateNormalOrder()
	bot1 := ctrl.AddBot()
	bot2 := ctrl.AddBot()
	time.Sleep(30 * time.Millisecond)
	t.Logf("  pending=%v bots=%v", ctrl.PendingIDs(), ctrl.RemainingBotIDs())

	t.Log("步骤2: 再下 VIP，让最新 bot2 处理中")
	busyOrder := ctrl.CreateVIPOrder()
	time.Sleep(30 * time.Millisecond)

	st2, cur2 := ctrl.BotState(bot2)
	if st2 != Processing || cur2 == nil {
		t.Fatalf("newest bot should be busy")
	}
	t.Logf("✓ bot2 正在处理 VIP #%d（Status=%s）", cur2.ID, st2)

	t.Log("步骤3: -Bot，应销毁最新 bot2")
	removed := ctrl.RemoveBot()
	if removed.ID != bot2.ID || ctrl.GetActiveBotCount() != 1 {
		t.Fatalf("should remove newest bot")
	}
	t.Logf("✓ 已销毁 Bot #%d，剩余 bot 数=%d", removed.ID, ctrl.GetActiveBotCount())

	t.Log("步骤4: 被打断的 VIP 应回 PENDING，或已被 bot1 接手")
	time.Sleep(30 * time.Millisecond)
	inPending := false
	for _, id := range ctrl.PendingIDs() {
		if id == busyOrder.ID {
			inPending = true
		}
	}
	st, cur := ctrl.BotState(bot1)
	takenByBot1 := st == Processing && cur != nil && cur.ID == busyOrder.ID
	if !inPending && !takenByBot1 {
		t.Fatalf("interrupted order should be pending or taken by remaining bot")
	}
	t.Logf("✓ 打断单 #%d: inPending=%v takenByBot1=%v pending=%v",
		busyOrder.ID, inPending, takenByBot1, ctrl.PendingIDs())

	t.Log("步骤5: 等待剩余 Bot 做完所有单")
	waitForProcess(t)
	waitForProcess(t)

	completed := ctrl.CompletedIDs()
	foundOrder, foundBusy := false, false
	for _, id := range completed {
		if id == order.ID {
			foundOrder = true
		}
		if id == busyOrder.ID {
			foundBusy = true
		}
	}
	if !foundOrder || !foundBusy {
		t.Fatalf("both orders should complete, got %v", completed)
	}
	t.Logf("✓ COMPLETE 列表=%v", completed)
	t.Log("✓ 需求6通过: -Bot 销毁最新；处理中订单回队并可被其他 Bot 接手")
}

func TestE2E_FullOrderControllerUserStory(t *testing.T) {
	ctrl := newE2EController()

	t.Log("步骤1: 混合下单，断言 VIP 优先队列")
	n1 := ctrl.CreateNormalOrder()
	v1 := ctrl.CreateVIPOrder()
	n2 := ctrl.CreateNormalOrder()
	assertIDs(t, ctrl.PendingIDs(), []int{v1.ID, n1.ID, n2.ID})

	t.Log("步骤2: +Bot，应先拿 VIP")
	bot1 := ctrl.AddBot()
	time.Sleep(30 * time.Millisecond)
	_, cur1 := ctrl.BotState(bot1)
	if cur1 == nil || cur1.ID != v1.ID {
		t.Fatalf("first bot should take VIP")
	}
	t.Logf("✓ bot1 处理 VIP #%d", v1.ID)

	t.Log("步骤3: 再 +Bot，接手下一个 Normal")
	bot2 := ctrl.AddBot()
	time.Sleep(30 * time.Millisecond)
	_, cur2 := ctrl.BotState(bot2)
	if cur2 == nil || cur2.ID != n1.ID {
		t.Fatalf("second bot should take Normal #%d", n1.ID)
	}
	assertIDs(t, ctrl.PendingIDs(), []int{n2.ID})
	t.Logf("✓ bot2 处理 Normal #%d，PENDING 剩 #%d", n1.ID, n2.ID)

	waitForProcess(t)
	if ctrl.OrderStatus(v1) != StatusComplete || ctrl.OrderStatus(n1) != StatusComplete {
		t.Fatalf("first wave should complete")
	}
	t.Log("✓ 第一波完成")

	waitForProcess(t)
	if ctrl.OrderStatus(n2) != StatusComplete {
		t.Fatalf("n2 should complete, got %s", ctrl.OrderStatus(n2))
	}
	t.Logf("✓ Normal #%d 完成", n2.ID)

	t.Log("步骤4: 新 VIP + -Bot，最终应全部完成")
	v2 := ctrl.CreateVIPOrder()
	time.Sleep(30 * time.Millisecond)
	ctrl.RemoveBot()
	if ctrl.GetActiveBotCount() != 1 {
		t.Fatalf("one bot should remain")
	}
	t.Logf("✓ 剩余 bot 数=%d", ctrl.GetActiveBotCount())

	waitForProcess(t)
	waitForProcess(t)
	if ctrl.OrderStatus(v2) != StatusComplete {
		t.Fatalf("VIP #%d should complete, got %s", v2.ID, ctrl.OrderStatus(v2))
	}
	if ctrl.GetPendingOrderCount() != 0 || ctrl.GetCompletedOrderCount() != 4 {
		t.Fatalf("pending=%d completed=%d", ctrl.GetPendingOrderCount(), ctrl.GetCompletedOrderCount())
	}
	t.Logf("✓ 全流程通过: pending=%d completed=%d", ctrl.GetPendingOrderCount(), ctrl.GetCompletedOrderCount())
}
