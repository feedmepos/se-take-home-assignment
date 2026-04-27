package controller

import (
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/feedmepos/order-controller/internal/clock"
	"github.com/feedmepos/order-controller/internal/output"
)

const procTime = 10 * time.Second

// logBuf is a goroutine-safe io.Writer that also exposes its contents as a string.
// Kept in test code so Logger stays free of test-only concerns.
type logBuf struct {
	mu  sync.Mutex
	buf strings.Builder
}

func (b *logBuf) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *logBuf) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func newTestController() (*Controller, *logBuf, *clock.Fake) {
	fake := clock.NewFake()
	buf := &logBuf{}
	return NewWithClock(output.NewLogger(buf), procTime, fake), buf, fake
}

func TestNormalOrderPending(t *testing.T) {
	c, logger, _ := newTestController()
	c.AddOrder(false)
	if !strings.Contains(logger.String(), "Normal Order #1 → PENDING") {
		t.Fatalf("unexpected output: %s", logger.String())
	}
}

func TestVIPOrderPending(t *testing.T) {
	c, logger, _ := newTestController()
	c.AddOrder(true)
	if !strings.Contains(logger.String(), "VIP Order #1 → PENDING") {
		t.Fatalf("unexpected output: %s", logger.String())
	}
}

func TestOrderIDIncreasing(t *testing.T) {
	c, logger, _ := newTestController()
	c.AddOrder(false)
	c.AddOrder(true)
	c.AddOrder(false)
	out := logger.String()
	if !strings.Contains(out, "Order #1") || !strings.Contains(out, "Order #2") || !strings.Contains(out, "Order #3") {
		t.Fatalf("order IDs not sequential: %s", out)
	}
}

func TestBotProcessesOrder(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false)
	c.AddBot()

	c.waitPickedUp(1)      // bot has picked up order #1, timer registered
	fake.Advance(procTime) // fire the timer
	c.WaitAll()            // bot has completed

	out := logger.String()
	if !strings.Contains(out, "→ PROCESSING") {
		t.Fatalf("expected PROCESSING in output: %s", out)
	}
	if !strings.Contains(out, "→ COMPLETE") {
		t.Fatalf("expected COMPLETE in output: %s", out)
	}
}

func TestVIPProcessedBeforeNormal(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false) // Normal #1
	c.AddOrder(true)  // VIP #2
	c.AddOrder(false) // Normal #3
	c.AddBot()

	c.waitPickedUp(1)      // bot picked up VIP #2
	fake.Advance(procTime) // complete VIP #2
	c.waitPickedUp(2)      // bot picked up Normal #1
	fake.Advance(procTime) // complete Normal #1
	c.waitPickedUp(3)      // bot picked up Normal #3
	fake.Advance(procTime) // complete Normal #3
	c.WaitAll()

	out := logger.String()
	vipIdx := strings.Index(out, "VIP Order #2 → PROCESSING")
	normIdx := strings.Index(out, "Normal Order #1 → PROCESSING")
	if vipIdx == -1 || normIdx == -1 {
		t.Fatalf("missing expected log lines: %s", out)
	}
	if vipIdx > normIdx {
		t.Fatalf("VIP should be processed before Normal:\n%s", out)
	}
}

func TestRemoveBotRequeuesOrder(t *testing.T) {
	c, _, _ := newTestController()
	c.AddOrder(false)
	c.AddBot()

	c.waitPickedUp(1) // bot is in select, timer registered but not fired
	c.RemoveBot()     // cancel bot → order requeued

	status := c.Status()
	if !strings.Contains(status, "Normal#1") {
		t.Fatalf("order should be pending after bot removed: %s", status)
	}
	if !strings.Contains(status, "bots=0") {
		t.Fatalf("should have 0 bots after removal: %s", status)
	}
}

func TestRemoveBotLIFO(t *testing.T) {
	c, logger, _ := newTestController()
	c.AddBot()
	c.AddBot()
	c.AddBot()
	c.RemoveBot()

	if !strings.Contains(logger.String(), "Bot #3 destroyed") {
		t.Fatalf("expected newest bot (Bot#3) to be removed: %s", logger.String())
	}
}

func TestIdleBotPicksUpNewOrder(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddBot() // idle, no orders

	c.AddOrder(false) // wakes idle bot
	c.waitPickedUp(1) // bot has picked it up
	fake.Advance(procTime)
	c.WaitAll()

	if !strings.Contains(logger.String(), "→ COMPLETE") {
		t.Fatalf("idle bot should pick up and complete the new order: %s", logger.String())
	}
}

func TestRemoveNonExistentBot(t *testing.T) {
	c, _, _ := newTestController()
	c.RemoveBot() // should not panic
}

func TestBotIdleLogWhenQueueEmpty(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false)
	c.AddBot()

	c.waitPickedUp(1)
	fake.Advance(procTime)
	c.WaitAll()

	if !strings.Contains(logger.String(), "is now IDLE") {
		t.Fatalf("expected IDLE log when queue empties: %s", logger.String())
	}
}

// TestRemoveIdleBot verifies that removing a bot with no current order does not
// requeue any phantom order and correctly decrements the bot count.
func TestRemoveIdleBot(t *testing.T) {
	c, logger, _ := newTestController()
	c.AddBot() // Bot#1 — idle (no orders)
	c.AddBot() // Bot#2 — idle
	c.RemoveBot()

	if !strings.Contains(logger.String(), "Bot #2 destroyed") {
		t.Fatalf("newest idle bot (Bot#2) should be destroyed: %s", logger.String())
	}
	status := c.Status()
	if !strings.Contains(status, "bots=1") {
		t.Fatalf("should have 1 bot remaining: %s", status)
	}
	if !strings.Contains(status, "pending=[]") {
		t.Fatalf("pending queue should be empty after removing idle bot: %s", status)
	}
}

func TestMultipleBotsProcessConcurrently(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false) // Normal #1
	c.AddOrder(false) // Normal #2
	c.AddBot()        // Bot#1 picks up #1
	c.AddBot()        // Bot#2 picks up #2

	c.waitPickedUp(2)      // both timers registered
	fake.Advance(procTime) // both complete simultaneously
	c.WaitAll()

	if strings.Count(logger.String(), "→ COMPLETE") != 2 {
		t.Fatalf("expected 2 completions: %s", logger.String())
	}
}

func TestBotProcessesMultipleOrdersSequentially(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false) // #1
	c.AddOrder(false) // #2
	c.AddOrder(false) // #3
	c.AddBot()        // single bot processes all three in order

	for i := 1; i <= 3; i++ {
		c.waitPickedUp(i)
		fake.Advance(procTime)
	}
	c.WaitAll()

	out := logger.String()
	if strings.Count(out, "→ COMPLETE") != 3 {
		t.Fatalf("expected 3 completions: %s", out)
	}
	if !strings.Contains(out, "is now IDLE") {
		t.Fatalf("bot should log IDLE after all orders are done: %s", out)
	}
}

// TestRemoveBotVIPRequeuedCorrectly ensures a VIP order being processed is
// requeued before later VIP orders (lower ID → earlier position).
func TestRemoveBotVIPRequeuedCorrectly(t *testing.T) {
	c, _, _ := newTestController()
	c.AddOrder(true) // VIP #1
	c.AddBot()

	c.waitPickedUp(1)
	c.AddOrder(true)  // VIP #2 — arrives while VIP#1 is processing
	c.AddOrder(false) // Normal #3
	c.RemoveBot()     // VIP#1 must be requeued before VIP#2

	status := c.Status()
	vip1 := strings.Index(status, "VIP#1")
	vip2 := strings.Index(status, "VIP#2")
	norm3 := strings.Index(status, "Normal#3")
	if vip1 == -1 || vip2 == -1 || norm3 == -1 {
		t.Fatalf("all three orders should be in pending: %s", status)
	}
	if vip1 >= vip2 || vip2 >= norm3 {
		t.Fatalf("expected order VIP#1 < VIP#2 < Normal#3 in status: %s", status)
	}
}

// TestAllBotsRemovedOrdersReturnToPending verifies that when all bots are removed
// their orders are returned and the queue is fully restored.
func TestAllBotsRemovedOrdersReturnToPending(t *testing.T) {
	c, _, _ := newTestController()
	c.AddOrder(false) // Normal #1 → queue: [Normal#1]
	c.AddOrder(true)  // VIP #2   → queue: [VIP#2, Normal#1]
	c.AddBot()        // Bot#1 picks up VIP#2
	c.AddBot()        // Bot#2 picks up Normal#1

	c.waitPickedUp(2)
	c.RemoveBot() // Bot#2 removed → Normal#1 returned
	c.RemoveBot() // Bot#1 removed → VIP#2 returned

	status := c.Status()
	if !strings.Contains(status, "bots=0") {
		t.Fatalf("no bots should remain: %s", status)
	}
	if !strings.Contains(status, "VIP#2") || !strings.Contains(status, "Normal#1") {
		t.Fatalf("both orders should be back in pending: %s", status)
	}
}

func TestOrderIDContinuesAfterCompletion(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false) // #1
	c.AddBot()

	c.waitPickedUp(1)
	fake.Advance(procTime)
	c.WaitAll()

	c.AddOrder(false) // must be #2, not reset
	if !strings.Contains(logger.String(), "Normal Order #2 → PENDING") {
		t.Fatalf("order ID should continue from #2: %s", logger.String())
	}
}

func TestStatusFormat(t *testing.T) {
	c, _, _ := newTestController()
	status := c.Status()
	for _, field := range []string{"bots=", "pending=", "processing=", "completed="} {
		if !strings.Contains(status, field) {
			t.Fatalf("Status() missing field %q: %s", field, status)
		}
	}
}

// TestVIPPriorityWithInterleavedAdditions checks the full priority ordering when
// VIP and Normal orders are added in interleaved fashion before any bot starts.
func TestVIPPriorityWithInterleavedAdditions(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false) // Normal #1
	c.AddOrder(false) // Normal #2
	c.AddOrder(true)  // VIP #3 → inserted before Normal#1 and #2
	c.AddOrder(true)  // VIP #4 → inserted after VIP#3, before Normals
	c.AddBot()        // single bot → processes VIP#3, VIP#4, Normal#1, Normal#2

	for i := 1; i <= 4; i++ {
		c.waitPickedUp(i)
		fake.Advance(procTime)
	}
	c.WaitAll()

	out := logger.String()
	idx := func(s string) int { return strings.Index(out, s) }
	vip3 := idx("VIP Order #3 → PROCESSING")
	vip4 := idx("VIP Order #4 → PROCESSING")
	norm1 := idx("Normal Order #1 → PROCESSING")
	norm2 := idx("Normal Order #2 → PROCESSING")

	if vip3 == -1 || vip4 == -1 || norm1 == -1 || norm2 == -1 {
		t.Fatalf("all 4 orders must appear in log: %s", out)
	}
	if vip3 >= vip4 || vip4 >= norm1 || norm1 >= norm2 {
		t.Fatalf("expected processing order VIP#3 → VIP#4 → Normal#1 → Normal#2:\n%s", out)
	}
}

// TestRequeuedOrderProcessedByNewBot ensures an order returned to pending after
// bot removal is picked up and completed by the next bot.
func TestRequeuedOrderProcessedByNewBot(t *testing.T) {
	c, logger, fake := newTestController()
	c.AddOrder(false) // Normal #1
	c.AddBot()        // Bot#1 picks it up

	c.waitPickedUp(1)
	c.RemoveBot() // Bot#1 removed → Normal#1 requeued

	c.AddBot() // Bot#2 — should immediately pick up Normal#1
	c.waitPickedUp(2)
	fake.Advance(procTime)
	c.WaitAll()

	out := logger.String()
	if !strings.Contains(out, "Bot #2 picked up Normal Order #1") {
		t.Fatalf("Bot#2 should have processed the requeued Normal#1: %s", out)
	}
	if !strings.Contains(out, "→ COMPLETE") {
		t.Fatalf("Normal#1 should be completed: %s", out)
	}
}
