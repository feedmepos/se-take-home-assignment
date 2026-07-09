package controller

import (
	"testing"
	"time"

	"mcdonalds-order-controller/model"
)

// noopLogger 测试用空日志
func noopLogger(format string, args ...interface{}) {}

// ===== Case 1: 普通订单出现在 PENDING 区域 =====

// TestNewNormalOrderAppearsInPending 新建普通订单状态为 Pending
func TestNewNormalOrderAppearsInPending(t *testing.T) {
	ctrl := New(noopLogger)

	o := ctrl.AddOrder(model.Normal)

	if o.Status != model.Pending {
		t.Errorf("期望状态为 Pending，实际为 %s", o.Status)
	}
	if ctrl.PendingCount() != 1 {
		t.Errorf("期望 PendingCount 为 1，实际为 %d", ctrl.PendingCount())
	}
	normal := ctrl.NormalQueueSnapshot()
	if len(normal) != 1 || normal[0].ID != o.ID {
		t.Errorf("期望普通队列包含新订单 #%d，实际为 %v", o.ID, normal)
	}
}

// TestMultipleNormalOrdersInPending 多个普通订单按 FIFO 排列
func TestMultipleNormalOrdersInPending(t *testing.T) {
	ctrl := New(noopLogger)

	o1 := ctrl.AddOrder(model.Normal)
	o2 := ctrl.AddOrder(model.Normal)
	o3 := ctrl.AddOrder(model.Normal)

	if ctrl.PendingCount() != 3 {
		t.Fatalf("期望 PendingCount 为 3，实际为 %d", ctrl.PendingCount())
	}
	normal := ctrl.NormalQueueSnapshot()
	if len(normal) != 3 {
		t.Fatalf("期望普通队列有 3 个订单，实际为 %d", len(normal))
	}
	if normal[0].ID != o1.ID || normal[1].ID != o2.ID || normal[2].ID != o3.ID {
		t.Errorf("期望顺序为 [#%d, #%d, #%d]，实际为 %v", o1.ID, o2.ID, o3.ID, normal)
	}
}

// ===== Case 2: VIP 订单排在所有普通订单之前，同类 FIFO =====

// TestNewVIPOrderAppearsInPending 新建 VIP 订单状态为 Pending
func TestNewVIPOrderAppearsInPending(t *testing.T) {
	ctrl := New(noopLogger)

	o := ctrl.AddOrder(model.VIP)

	if o.Status != model.Pending {
		t.Errorf("期望状态为 Pending，实际为 %s", o.Status)
	}
	if ctrl.PendingCount() != 1 {
		t.Errorf("期望 PendingCount 为 1，实际为 %d", ctrl.PendingCount())
	}
	vip := ctrl.VipQueueSnapshot()
	if len(vip) != 1 || vip[0].ID != o.ID {
		t.Errorf("期望 VIP 队列包含新订单 #%d，实际为 %v", o.ID, vip)
	}
}

// TestVIPOrderBeforeAllNormal VIP 订单优先于所有普通订单出队
func TestVIPOrderBeforeAllNormal(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal) // 订单 1
	ctrl.AddOrder(model.Normal) // 订单 2
	ctrl.AddOrder(model.VIP)    // 订单 3 — 应最先出队
	ctrl.AddOrder(model.Normal) // 订单 4

	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	// VIP 已被领取
	vip := ctrl.VipQueueSnapshot()
	if len(vip) != 0 {
		t.Errorf("期望 VIP 队列为空，实际为 %v", vip)
	}
	// 普通队列仍有 3 个
	normal := ctrl.NormalQueueSnapshot()
	if len(normal) != 3 {
		t.Errorf("期望普通队列有 3 个订单，实际为 %d", len(normal))
	}
}

// TestVIPOrderBehindExistingVIP VIP 同类 FIFO，均排在普通之前
func TestVIPOrderBehindExistingVIP(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.VIP)    // 订单 1
	ctrl.AddOrder(model.Normal) // 订单 2
	ctrl.AddOrder(model.Normal) // 订单 3
	ctrl.AddOrder(model.VIP)    // 订单 4 — 在 VIP 1 之后、Normal 之前

	// 队列快照：VIP [1,4]，Normal [2,3]
	vip := ctrl.VipQueueSnapshot()
	normal := ctrl.NormalQueueSnapshot()

	if len(vip) != 2 {
		t.Fatalf("期望 2 个 VIP 订单，实际为 %d", len(vip))
	}
	if vip[0].ID != 1 || vip[1].ID != 4 {
		t.Errorf("期望 VIP 队列为 [#1, #4]，实际为 %v", vip)
	}
	if len(normal) != 2 {
		t.Fatalf("期望 2 个普通订单，实际为 %d", len(normal))
	}
	if normal[0].ID != 2 || normal[1].ID != 3 {
		t.Errorf("期望普通队列为 [#2, #3]，实际为 %v", normal)
	}

	// 出队顺序：1(VIP), 4(VIP), 2(Normal), 3(Normal)
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	vip = ctrl.VipQueueSnapshot()
	if len(vip) != 1 || vip[0].ID != 4 {
		t.Errorf("期望 VIP 队列只剩 #4，实际为 %v", vip)
	}
	normal = ctrl.NormalQueueSnapshot()
	if len(normal) != 2 {
		t.Errorf("期望普通队列仍有 2 个订单，实际为 %d", len(normal))
	}
}

// ===== Case 3: 订单 ID 唯一且递增 =====

// TestOrderIDUniqueAndIncreasing ID 从 1 开始严格递增
func TestOrderIDUniqueAndIncreasing(t *testing.T) {
	ctrl := New(noopLogger)

	o1 := ctrl.AddOrder(model.Normal)
	o2 := ctrl.AddOrder(model.VIP)
	o3 := ctrl.AddOrder(model.Normal)

	if o1.ID != 1 || o2.ID != 2 || o3.ID != 3 {
		t.Errorf("期望 ID 为 1,2,3，实际为 %d,%d,%d", o1.ID, o2.ID, o3.ID)
	}
}

// TestOrderIDUniquenessAcrossMany 大量订单 ID 唯一且递增
func TestOrderIDUniquenessAcrossMany(t *testing.T) {
	ctrl := New(noopLogger)

	ids := make(map[int]bool)
	var prev int
	for i := 0; i < 20; i++ {
		o := ctrl.AddOrder(model.Normal)
		if ids[o.ID] {
			t.Errorf("订单 ID #%d 重复", o.ID)
		}
		ids[o.ID] = true
		if o.ID <= prev {
			t.Errorf("订单 ID #%d 未递增（前一个为 #%d）", o.ID, prev)
		}
		prev = o.ID
	}
}

// ===== Case 4: 机器人领取订单，10秒后完成，自动领取下一个 =====

// TestBotPicksUpPendingOrderImmediately 新机器人立即领取待处理订单
func TestBotPicksUpPendingOrderImmediately(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal)

	if ctrl.PendingCount() != 1 {
		t.Fatalf("期望创建机器人前有 1 个待处理订单")
	}

	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	if ctrl.PendingCount() != 0 {
		t.Errorf("期望机器人领取后待处理为 0，实际为 %d", ctrl.PendingCount())
	}
}

// TestOrderMovesToCompleteAfter10s 10秒后订单移至 COMPLETE
func TestOrderMovesToCompleteAfter10s(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal)
	ctrl.AddBot()

	time.Sleep(50 * time.Millisecond)

	if ctrl.PendingCount() != 0 {
		t.Errorf("期望领取后 PendingCount 为 0，实际为 %d", ctrl.PendingCount())
	}

	time.Sleep(10100 * time.Millisecond)

	completed := ctrl.CompleteSnapshot()
	if len(completed) != 1 {
		t.Fatalf("期望 COMPLETE 有 1 个订单，实际为 %d", len(completed))
	}
	if completed[0].ID != 1 {
		t.Errorf("期望 COMPLETE 为订单 #1，实际为 #%d", completed[0].ID)
	}
	if completed[0].Status != model.Complete {
		t.Errorf("期望状态为 Complete，实际为 %s", completed[0].Status)
	}
	if ctrl.PendingCount() != 0 {
		t.Errorf("期望 PENDING 为空，实际为 %d", ctrl.PendingCount())
	}
}

// TestBotProcessesNextOrderAfterCompletion 完成后自动领取下一个
func TestBotProcessesNextOrderAfterCompletion(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal) // 订单 1
	ctrl.AddOrder(model.Normal) // 订单 2
	ctrl.AddBot()               // 领取订单 1

	time.Sleep(50 * time.Millisecond)

	if ctrl.PendingCount() != 1 {
		t.Errorf("期望 1 个待处理订单，实际为 %d", ctrl.PendingCount())
	}

	// 等待订单 1 完成，机器人自动领取订单 2
	time.Sleep(10100 * time.Millisecond)

	if ctrl.PendingCount() != 0 {
		t.Errorf("期望自动领取后 PendingCount 为 0，实际为 %d", ctrl.PendingCount())
	}
	completed := ctrl.CompleteSnapshot()
	if len(completed) != 1 || completed[0].ID != 1 {
		t.Errorf("期望 COMPLETE 有订单 #1，实际为 %v", completed)
	}

	// 再等 10 秒，订单 2 也完成
	time.Sleep(10100 * time.Millisecond)

	completed = ctrl.CompleteSnapshot()
	if len(completed) != 2 {
		t.Errorf("期望 COMPLETE 有 2 个订单，实际为 %d", len(completed))
	}
}

// ===== Case 5: 无订单时机器人空闲，新订单到来立即领取 =====

// TestBotIdleWhenNoPendingOrders 无订单时机器人空闲
func TestBotIdleWhenNoPendingOrders(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	if ctrl.BotCount() != 1 {
		t.Errorf("期望 1 个机器人，实际为 %d", ctrl.BotCount())
	}
	if ctrl.PendingCount() != 0 {
		t.Errorf("期望无待处理订单，实际为 %d", ctrl.PendingCount())
	}
}

// TestIdleBotPicksUpNewOrder 空闲机器人立即领取新订单
func TestIdleBotPicksUpNewOrder(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	ctrl.AddOrder(model.Normal)
	time.Sleep(50 * time.Millisecond)

	if ctrl.PendingCount() != 0 {
		t.Errorf("期望空闲机器人领取后 PendingCount 为 0，实际为 %d", ctrl.PendingCount())
	}
}

// TestBotBecomesIdleAfterAllOrdersDone 完成所有订单后空闲，新订单到来重新激活
func TestBotBecomesIdleAfterAllOrdersDone(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal)
	ctrl.AddBot()

	time.Sleep(50 * time.Millisecond)
	time.Sleep(10100 * time.Millisecond)

	if ctrl.PendingCount() != 0 {
		t.Errorf("期望无待处理订单，实际为 %d", ctrl.PendingCount())
	}
	if ctrl.BotCount() != 1 {
		t.Errorf("期望机器人仍存在，实际为 %d", ctrl.BotCount())
	}

	// 新订单到来，空闲机器人立即领取
	ctrl.AddOrder(model.Normal)
	time.Sleep(50 * time.Millisecond)

	if ctrl.PendingCount() != 0 {
		t.Errorf("期望空闲机器人立即领取，PendingCount 为 0，实际为 %d", ctrl.PendingCount())
	}
}

// ===== Case 6: 销毁最新机器人，其订单返回队列头部 =====

// TestRemoveNewestBot 销毁最新创建的机器人
func TestRemoveNewestBot(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal) // 订单 1
	ctrl.AddOrder(model.Normal) // 订单 2

	ctrl.AddBot() // 机器人 1 领取订单 1
	ctrl.AddBot() // 机器人 2 领取订单 2

	time.Sleep(50 * time.Millisecond)

	ctrl.RemoveBot() // 销毁机器人 2，订单 2 返回队列

	if ctrl.BotCount() != 1 {
		t.Errorf("期望剩余 1 个机器人，实际为 %d", ctrl.BotCount())
	}
	normal := ctrl.NormalQueueSnapshot()
	if len(normal) != 1 || normal[0].ID != 2 {
		t.Errorf("期望订单 #2 返回普通队列，实际为 %v", normal)
	}
}

// TestDestroyedBotOrderReturnsToHeadOfNormalQueue 普通订单返回普通队列头部
func TestDestroyedBotOrderReturnsToHeadOfNormalQueue(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal) // 订单 1 — 将被领取
	ctrl.AddOrder(model.Normal) // 订单 2 — 等待

	ctrl.AddBot() // 领取订单 1
	time.Sleep(50 * time.Millisecond)

	ctrl.RemoveBot() // 订单 1 返回普通队列头部

	normal := ctrl.NormalQueueSnapshot()
	if len(normal) != 2 {
		t.Fatalf("期望 2 个普通订单，实际为 %d", len(normal))
	}
	if normal[0].ID != 1 {
		t.Errorf("期望订单 #1 在头部，实际为 #%d", normal[0].ID)
	}
	if normal[1].ID != 2 {
		t.Errorf("期望订单 #2 在第二位，实际为 #%d", normal[1].ID)
	}
}

// TestDestroyedBotVIPOrderReturnsToHeadOfVIPQueue VIP 订单返回 VIP 队列头部
func TestDestroyedBotVIPOrderReturnsToHeadOfVIPQueue(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal) // 订单 1 — 普通
	ctrl.AddOrder(model.VIP)    // 订单 2 — VIP

	ctrl.AddBot() // 领取 VIP 订单 2
	time.Sleep(50 * time.Millisecond)

	ctrl.RemoveBot() // 订单 2 返回 VIP 队列头部

	vip := ctrl.VipQueueSnapshot()
	normal := ctrl.NormalQueueSnapshot()

	if len(vip) != 1 || vip[0].ID != 2 {
		t.Errorf("期望 VIP 队列包含 #2，实际为 %v", vip)
	}
	if len(normal) != 1 || normal[0].ID != 1 {
		t.Errorf("期望普通队列包含 #1，实际为 %v", normal)
	}
}

// TestDestroyedBotOrderMaintainsPriorityOverNormal 返回的 VIP 订单仍优先于普通订单
func TestDestroyedBotOrderMaintainsPriorityOverNormal(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.Normal) // 订单 1
	ctrl.AddOrder(model.VIP)    // 订单 2
	ctrl.AddOrder(model.Normal) // 订单 3

	ctrl.AddBot() // 领取 VIP 订单 2
	time.Sleep(50 * time.Millisecond)

	ctrl.RemoveBot() // 订单 2 返回 VIP 队列头部

	vip := ctrl.VipQueueSnapshot()
	normal := ctrl.NormalQueueSnapshot()

	if len(vip) != 1 || vip[0].ID != 2 {
		t.Errorf("期望 VIP 队列包含 #2，实际为 %v", vip)
	}
	if len(normal) != 2 {
		t.Errorf("期望普通队列有 2 个订单，实际为 %d", len(normal))
	}

	// 新机器人验证出队顺序：VIP 优先
	ctrl.AddBot()
	time.Sleep(50 * time.Millisecond)

	vip = ctrl.VipQueueSnapshot()
	if len(vip) != 0 {
		t.Errorf("期望 VIP 已被领取，实际为 %v", vip)
	}
	normal = ctrl.NormalQueueSnapshot()
	if len(normal) != 2 {
		t.Errorf("期望普通队列仍有 2 个订单，实际为 %d", len(normal))
	}
}

// TestDestroyedBotVIPOrderReturnToHeadBeforeOtherVIPs 被中断 VIP 返回头部，优先于其他 VIP
func TestDestroyedBotVIPOrderReturnToHeadBeforeOtherVIPs(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.AddOrder(model.VIP)    // 订单 1
	ctrl.AddOrder(model.VIP)    // 订单 2
	ctrl.AddOrder(model.Normal) // 订单 3

	ctrl.AddBot() // 领取 VIP 订单 1
	time.Sleep(50 * time.Millisecond)

	ctrl.RemoveBot() // 订单 1 返回 VIP 队列头部

	vip := ctrl.VipQueueSnapshot()
	if len(vip) != 2 {
		t.Fatalf("期望 2 个 VIP 订单，实际为 %d", len(vip))
	}
	if vip[0].ID != 1 {
		t.Errorf("期望 VIP 队列头部为 #1，实际为 #%d", vip[0].ID)
	}
	if vip[1].ID != 2 {
		t.Errorf("期望 VIP 队列第二位为 #2，实际为 #%d", vip[1].ID)
	}
}

// TestRemoveBotWhenNoneExists 无机器人时安全无副作用
func TestRemoveBotWhenNoneExists(t *testing.T) {
	ctrl := New(noopLogger)

	ctrl.RemoveBot()

	if ctrl.BotCount() != 0 {
		t.Errorf("期望 0 个机器人，实际为 %d", ctrl.BotCount())
	}
}

// ===== Case 7: 所有状态均在内存中 =====

// TestInMemoryProcessing Controller 实例间状态完全隔离
func TestInMemoryProcessing(t *testing.T) {
	ctrl1 := New(noopLogger)
	ctrl2 := New(noopLogger)

	ctrl1.AddOrder(model.Normal)
	ctrl1.AddOrder(model.VIP)

	if ctrl2.PendingCount() != 0 {
		t.Errorf("期望 ctrl2 无待处理订单（内存隔离），实际为 %d", ctrl2.PendingCount())
	}
	if ctrl1.PendingCount() != 2 {
		t.Errorf("期望 ctrl1 有 2 个待处理订单，实际为 %d", ctrl1.PendingCount())
	}
}
