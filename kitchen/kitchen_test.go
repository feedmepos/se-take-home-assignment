package kitchen

import (
	"reflect"
	"testing"
	"time"
)

// 测试用较短的烹饪时长，避免用例过慢。
const cook = 40 * time.Millisecond

// eventually 在 timeout 内轮询 cond，直到为真；否则用 msg 让用例失败。
func eventually(t *testing.T, timeout time.Duration, msg string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatalf("condition not met within %v: %s", timeout, msg)
}

// TestNormalOrderFlow：普通订单经机器人处理后从 PENDING 流向 COMPLETE。
func TestNormalOrderFlow(t *testing.T) {
	c := New(cook, nil)
	c.NewOrder(Normal)
	if got := c.Snapshot().PendingIDs(); !reflect.DeepEqual(got, []int{1}) {
		t.Fatalf("expected pending [1], got %v", got)
	}
	c.AddBot()
	eventually(t, time.Second, "order should complete", func() bool {
		return reflect.DeepEqual(c.Snapshot().CompleteIDs(), []int{1})
	})
	if got := c.Snapshot().PendingIDs(); len(got) != 0 {
		t.Fatalf("expected empty pending, got %v", got)
	}
}

// TestUniqueIncrementingIDs：订单号唯一且自增。
func TestUniqueIncrementingIDs(t *testing.T) {
	c := New(cook, nil)
	if a, b, d := c.NewOrder(Normal), c.NewOrder(VIP), c.NewOrder(Normal); a != 1 || b != 2 || d != 3 {
		t.Fatalf("expected ids 1,2,3 got %d,%d,%d", a, b, d)
	}
}

// TestVIPPriority：VIP 排在普通订单之前。
func TestVIPPriority(t *testing.T) {
	c := New(cook, nil)
	c.NewOrder(Normal) // #1
	c.NewOrder(Normal) // #2
	c.NewOrder(VIP)    // #3，应插到两张普通单之前
	if got := c.Snapshot().PendingIDs(); !reflect.DeepEqual(got, []int{3, 1, 2}) {
		t.Fatalf("expected [3 1 2], got %v", got)
	}
}

// TestVIPQueueBehindExistingVIP：新 VIP 排在既有 VIP 之后、普通单之前。
func TestVIPQueueBehindExistingVIP(t *testing.T) {
	c := New(cook, nil)
	c.NewOrder(VIP)    // #1
	c.NewOrder(Normal) // #2
	c.NewOrder(VIP)    // #3，应在 #1 之后、#2 之前
	if got := c.Snapshot().PendingIDs(); !reflect.DeepEqual(got, []int{1, 3, 2}) {
		t.Fatalf("expected [1 3 2], got %v", got)
	}
}

// TestBotsProcessConcurrently：两台机器人可并行处理两张单。
func TestBotsProcessConcurrently(t *testing.T) {
	c := New(cook, nil)
	c.NewOrder(Normal)
	c.NewOrder(Normal)
	c.AddBot()
	c.AddBot()
	// 若串行需 ~2*cook；并行只需 ~1*cook。给足余量但小于 2*cook。
	eventually(t, cook+cook/2+50*time.Millisecond, "both orders complete concurrently", func() bool {
		return len(c.Snapshot().CompleteIDs()) == 2
	})
}

// TestRemoveBotReturnsOrderToPending：移除正在烹饪的机器人，订单退回原优先级位置。
func TestRemoveBotReturnsOrderToPending(t *testing.T) {
	c := New(cook, nil)
	c.NewOrder(VIP)    // #1
	c.NewOrder(Normal) // #2
	c.AddBot()
	// 等机器人开始做 VIP #1
	eventually(t, time.Second, "bot picks up #1", func() bool {
		bs := c.Snapshot().Bots
		return len(bs) == 1 && bs[0].Cooking == 1
	})
	c.RemoveBot() // 移除后 #1 应退回 pending，且排在普通单 #2 之前
	snap := c.Snapshot()
	if len(snap.Bots) != 0 {
		t.Fatalf("expected 0 bots, got %d", len(snap.Bots))
	}
	if got := snap.PendingIDs(); !reflect.DeepEqual(got, []int{1, 2}) {
		t.Fatalf("expected pending [1 2] after preemption, got %v", got)
	}
	if got := snap.CompleteIDs(); len(got) != 0 {
		t.Fatalf("expected nothing completed, got %v", got)
	}
}

// TestIdleBotPicksUpNewOrder：空闲机器人等到新订单后立即处理。
func TestIdleBotPicksUpNewOrder(t *testing.T) {
	c := New(cook, nil)
	c.AddBot() // 先加机器人，此时无单，应空闲
	eventually(t, 200*time.Millisecond, "bot should be idle", func() bool {
		bs := c.Snapshot().Bots
		return len(bs) == 1 && !bs[0].IsCooking
	})
	c.NewOrder(Normal)
	eventually(t, time.Second, "idle bot picks up and completes", func() bool {
		return reflect.DeepEqual(c.Snapshot().CompleteIDs(), []int{1})
	})
}

// TestRemoveBotWhenNone：无机器人时移除不 panic，返回 0。
func TestRemoveBotWhenNone(t *testing.T) {
	c := New(cook, nil)
	if id := c.RemoveBot(); id != 0 {
		t.Fatalf("expected 0, got %d", id)
	}
}

// TestShutdownStopsBots：Shutdown 停掉全部机器人。
func TestShutdownStopsBots(t *testing.T) {
	c := New(cook, nil)
	c.AddBot()
	c.AddBot()
	c.Shutdown()
	if n := len(c.Snapshot().Bots); n != 0 {
		t.Fatalf("expected 0 bots after shutdown, got %d", n)
	}
}
