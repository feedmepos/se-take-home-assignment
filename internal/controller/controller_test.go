package controller

import (
	"bytes"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/model"
)

// testTimer manages a pool of controllable timer channels.
// Each call to newTimer() creates a fresh channel; trigger()
// sends on the oldest untriggered channel.
type testTimer struct {
	mu       sync.Mutex
	channels []chan time.Time
}

func (tt *testTimer) newTimer() <-chan time.Time {
	tt.mu.Lock()
	defer tt.mu.Unlock()
	ch := make(chan time.Time, 1)
	tt.channels = append(tt.channels, ch)
	return ch
}

func (tt *testTimer) trigger() {
	tt.mu.Lock()
	defer tt.mu.Unlock()
	if len(tt.channels) > 0 {
		ch := tt.channels[0]
		tt.channels = tt.channels[1:]
		ch <- time.Now()
	}
}

// newTestController creates a Controller for testing with a controllable timer
// and a bytes.Buffer for capturing output.
func newTestController() (*Controller, *testTimer) {
	var buf bytes.Buffer
	tt := &testTimer{}
	c := NewController(&buf, tt.newTimer)
	return c, tt
}

// triggerComplete triggers the oldest pending timer channel.
func triggerComplete(tt *testTimer) {
	tt.trigger()
	time.Sleep(10 * time.Millisecond)
}

// --- 3.1 订单创建 ---

func TestAddNormalOrder(t *testing.T) {
	c, _ := newTestController()
	c.AddNormalOrder()

	if c.queue.Len() != 1 {
		t.Errorf("queue Len = %d, want 1", c.queue.Len())
	}
	o := c.queue.Dequeue()
	if o.Type != model.OrderNormal {
		t.Errorf("order Type = %v, want Normal", o.Type)
	}
	if o.ID != 1001 {
		t.Errorf("first order ID = %d, want 1001", o.ID)
	}
}

func TestAddVIPOrder(t *testing.T) {
	c, _ := newTestController()
	c.AddVIPOrder()

	o := c.queue.Dequeue()
	if o.Type != model.OrderVIP {
		t.Errorf("order Type = %v, want VIP", o.Type)
	}
}

func TestOrderIDsIncrement(t *testing.T) {
	c, _ := newTestController()
	c.AddNormalOrder()
	c.AddVIPOrder()
	c.AddNormalOrder()

	// dequeue all and check IDs
	ids := make([]int, 0, 3)
	for i := 0; i < 3; i++ {
		o := c.queue.Dequeue()
		if o != nil {
			ids = append(ids, o.ID)
		}
	}
	// VIP first, then normals: 1002, 1001, 1003
	expectedIDs := []int{1002, 1001, 1003}
	for i, want := range expectedIDs {
		if i < len(ids) && ids[i] != want {
			t.Errorf("dequeue[%d] ID = %d, want %d", i, ids[i], want)
		}
	}
}

// --- 3.2 Bot 创建与自动分配 ---

func TestAddBotPicksUpPendingOrder(t *testing.T) {
	c, _ := newTestController()
	c.AddVIPOrder() // enqueue VIP first

	c.AddBot()

	if len(c.bots) != 1 {
		t.Fatalf("bots count = %d, want 1", len(c.bots))
	}
	if c.bots[0].Status != model.BotProcessing {
		t.Errorf("bot Status = %v, want Processing", c.bots[0].Status)
	}
	if c.queue.Len() != 0 {
		t.Errorf("queue Len after assign = %d, want 0", c.queue.Len())
	}
}

func TestVIPPickedUpFirst(t *testing.T) {
	c, _ := newTestController()
	c.AddNormalOrder()
	c.AddVIPOrder()

	c.AddBot()

	if c.bots[0].CurrentOrder.Type != model.OrderVIP {
		t.Errorf("bot picked up %v, want VIP", c.bots[0].CurrentOrder.Type)
	}
}

func TestAddBotWhenEmptyGoesIdle(t *testing.T) {
	c, _ := newTestController()
	c.AddBot()

	if c.bots[0].Status != model.BotIdle {
		t.Errorf("empty queue bot Status = %v, want Idle", c.bots[0].Status)
	}
	if c.bots[0].CurrentOrder != nil {
		t.Error("empty queue bot should have no CurrentOrder")
	}
}

// --- 3.3 IDLE Bot 自动唤醒 ---

func TestIdleBotWakesOnNewOrder(t *testing.T) {
	c, _ := newTestController()
	c.AddBot() // idle bot

	c.AddNormalOrder()

	if c.bots[0].Status != model.BotProcessing {
		t.Errorf("idle bot should wake up, Status = %v, want Processing", c.bots[0].Status)
	}
}

// --- 3.4 订单完成与接力 ---

func TestBotCompletesAndPicksNext(t *testing.T) {
	c, tt := newTestController()
	c.AddVIPOrder()
	c.AddNormalOrder()
	c.AddBot()

	// bot is processing VIP, trigger completion
	triggerComplete(tt)

	// VIP should be COMPLETE, bot should be processing Normal
	if c.bots[0].Status != model.BotProcessing {
		t.Errorf("after complete, bot Status = %v, want Processing (picked next)", c.bots[0].Status)
	}
	if c.bots[0].CurrentOrder == nil || c.bots[0].CurrentOrder.Type != model.OrderNormal {
		t.Errorf("bot should be processing Normal order, got %v", c.bots[0].CurrentOrder)
	}
}

func TestBotGoesIdleWhenQueueEmpty(t *testing.T) {
	c, tt := newTestController()
	c.AddNormalOrder()
	c.AddBot()

	triggerComplete(tt)

	if c.bots[0].Status != model.BotIdle {
		t.Errorf("after last order, bot Status = %v, want Idle", c.bots[0].Status)
	}
}

// --- 3.5 Bot 移除与回滚 ---

func TestRemoveIdleBot(t *testing.T) {
	c, _ := newTestController()
	c.AddBot() // idle
	c.AddBot() // idle

	c.RemoveBot()

	if len(c.bots) != 1 {
		t.Errorf("after remove, bots count = %d, want 1", len(c.bots))
	}
	if c.bots[0].ID != 1 {
		t.Errorf("remaining bot ID = %d, want 1 (newest removed)", c.bots[0].ID)
	}
}

func TestRemoveProcessingBotRollsBackOrder(t *testing.T) {
	c, _ := newTestController()
	c.AddVIPOrder()
	c.AddBot()

	c.RemoveBot()

	// Order should be back in queue
	if c.queue.Len() != 1 {
		t.Errorf("after remove, queue Len = %d, want 1 (rolled back)", c.queue.Len())
	}
	o := c.queue.Dequeue()
	if o.Type != model.OrderVIP {
		t.Errorf("rolled back order Type = %v, want VIP", o.Type)
	}
	// Bot should be removed
	if len(c.bots) != 0 {
		t.Errorf("bots should be empty after remove, got %d", len(c.bots))
	}
}

func TestRemoveBotLIFO(t *testing.T) {
	c, _ := newTestController()
	// create 2 orders so both bots can pick up
	c.AddVIPOrder()
	c.AddVIPOrder()

	c.AddBot() // Bot#1 takes first VIP
	c.AddBot() // Bot#2 takes second VIP

	c.RemoveBot() // should remove Bot#2 (newest)

	if len(c.bots) != 1 {
		t.Fatalf("bots count = %d, want 1", len(c.bots))
	}
	if c.bots[0].ID != 1 {
		t.Errorf("remaining bot ID = %d, want 1, got %d", c.bots[0].ID, c.bots[0].ID)
	}
}

func TestRollbackPreservesVIPPriority(t *testing.T) {
	c, tt := newTestController()
	c.AddVIPOrder()   // VIP#1001
	c.AddNormalOrder() // Normal#1002
	c.AddBot()         // takes VIP#1001
	c.AddBot()         // takes Normal#1002

	// Remove Bot#2 which is processing Normal#1002
	c.RemoveBot()

	// Normal#1002 should be back in PENDING, behind VIP#1001 (still processing)
	if c.queue.Len() != 1 {
		t.Errorf("queue Len after rollback = %d, want 1", c.queue.Len())
	}

	// complete Bot#1 (VIP#1001)
	triggerComplete(tt)

	// Bot#1 should now pick Normal#1002 (the rolled back one)
	if c.bots[0].CurrentOrder == nil || c.bots[0].CurrentOrder.Type != model.OrderNormal {
		t.Errorf("bot should have picked rolled back Normal, got %v", c.bots[0].CurrentOrder)
	}
}

// --- 3.6 端到端场景 ---

func TestEndToEndScenario(t *testing.T) {
	c, tt := newTestController()

	// Step 1: AddNormalOrder → pending: [N#1001]
	c.AddNormalOrder()
	if c.queue.Len() != 1 {
		t.Fatalf("step1: queue Len = %d, want 1", c.queue.Len())
	}

	// Step 2: AddVIPOrder → pending: [V#1002, N#1001]
	c.AddVIPOrder()
	if c.queue.Len() != 2 {
		t.Fatalf("step2: queue Len = %d, want 2", c.queue.Len())
	}

	// Step 3: AddNormalOrder → pending: [V#1002, N#1001, N#1003]
	c.AddNormalOrder()
	if c.queue.Len() != 3 {
		t.Fatalf("step3: queue Len = %d, want 3", c.queue.Len())
	}

	// Step 4: AddBot → Bot#1 takes V#1002
	c.AddBot()
	if c.bots[0].CurrentOrder == nil || c.bots[0].CurrentOrder.ID != 1002 {
		t.Fatalf("step4: bot should process V#1002, got %v", c.bots[0].CurrentOrder)
	}

	// Step 5: Trigger Bot#1 complete → V#1002 COMPLETE; Bot#1 takes N#1001
	triggerComplete(tt)
	if c.bots[0].CurrentOrder == nil || c.bots[0].CurrentOrder.ID != 1001 {
		t.Fatalf("step5: bot should process N#1001, got %v", c.bots[0].CurrentOrder)
	}

	// Step 6: AddBot → Bot#2 takes N#1003
	c.AddBot()
	if len(c.bots) != 2 {
		t.Fatalf("step6: bots count = %d, want 2", len(c.bots))
	}
	if c.bots[1].CurrentOrder == nil || c.bots[1].CurrentOrder.ID != 1003 {
		t.Fatalf("step6: Bot#2 should process N#1003, got %v", c.bots[1].CurrentOrder)
	}

	// Step 7: RemoveBot → Bot#2 removed; N#1003 rolled back to Normal front
	c.RemoveBot()
	if len(c.bots) != 1 {
		t.Fatalf("step7: bots count = %d, want 1", len(c.bots))
	}
	if c.queue.Len() != 1 {
		t.Fatalf("step7: queue Len = %d, want 1 (rolled back)", c.queue.Len())
	}

	// RemoveBot left Bot#2's timer channel orphaned in the queue.
	// Consume it so subsequent triggers reach Bot#1's channels.
	tt.trigger()

	// Step 8: Trigger Bot#1 complete → N#1001 COMPLETE; Bot#1 takes N#1003
	triggerComplete(tt)
	if c.bots[0].CurrentOrder == nil || c.bots[0].CurrentOrder.ID != 1003 {
		t.Fatalf("step8: bot should process N#1003, got %v", c.bots[0].CurrentOrder)
	}

	// Step 9: Trigger Bot#1 complete → N#1003 COMPLETE; Bot#1 IDLE
	triggerComplete(tt)
	if c.bots[0].Status != model.BotIdle {
		t.Fatalf("step9: bot Status = %v, want Idle", c.bots[0].Status)
	}

	// Verify result.txt output
	output := c.ResultWriter().(*bytes.Buffer).String()
	if !strings.Contains(output, "COMPLETE") {
		t.Error("result should contain COMPLETE events")
	}
	if !strings.Contains(output, "System initialized") {
		t.Error("result should contain initialization")
	}
}
