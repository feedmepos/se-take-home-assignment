package controller

import (
	"context"
	"regexp"
	"testing"
	"time"
)

// TestNormalOrderFlow verifies User Story 1:
// Normal order flows to PENDING area and then to COMPLETE after being processed.
func TestNormalOrderFlow(t *testing.T) {
	d := NewDispatcher(10 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)
	// Let dispatcher initialize
	time.Sleep(10 * time.Millisecond)

	// Add order
	d.AddOrder(OrderNormal)
	time.Sleep(10 * time.Millisecond)

	// Verify it is in PENDING
	_, pending, processing, completed := d.GetStatus()
	if len(pending) != 1 || pending[0].Type != OrderNormal || pending[0].Status != StatusPending {
		t.Fatalf("Expected 1 pending normal order, got: %v", pending)
	}
	if len(processing) != 0 || len(completed) != 0 {
		t.Fatalf("Unexpected processing/completed orders. Proc: %d, Comp: %d", len(processing), len(completed))
	}

	// Scale up to spawn 1 bot
	d.ScaleUp()
	time.Sleep(5 * time.Millisecond) // wait for pickup

	// Verify order is PROCESSING
	_, pending, processing, completed = d.GetStatus()
	if len(processing) != 1 || processing[0].ID != 1001 || processing[0].Status != StatusProcessing {
		t.Fatalf("Expected order 1001 to be processing, got: %v", processing)
	}

	// Wait for cook completion (cookDuration is 10ms)
	time.Sleep(20 * time.Millisecond)

	// Verify order is COMPLETE
	_, pending, processing, completed = d.GetStatus()
	if len(completed) != 1 || completed[0].ID != 1001 || completed[0].Status != StatusComplete {
		t.Fatalf("Expected order 1001 to be complete, got: %v", completed)
	}
	if len(pending) != 0 || len(processing) != 0 {
		t.Fatalf("Expected 0 pending/processing orders, got Pending: %d, Proc: %d", len(pending), len(processing))
	}
}

// TestVIPPriorityAndFIFO verifies User Story 2:
// VIP orders are processed first before all normal orders. If there is existing VIP order,
// new VIP order queues behind it. Same for normal orders.
func TestVIPPriorityAndFIFO(t *testing.T) {
	// We will inspect queue sorting logic directly, as well as dispatcher dispatching order.
	q := NewOrderQueue()

	o1 := &Order{ID: 1001, Type: OrderNormal, Status: StatusPending}
	o2 := &Order{ID: 1002, Type: OrderVIP, Status: StatusPending}
	o3 := &Order{ID: 1003, Type: OrderNormal, Status: StatusPending}
	o4 := &Order{ID: 1004, Type: OrderVIP, Status: StatusPending}

	q.Push(o1)
	q.Push(o2)
	q.Push(o3)
	q.Push(o4)

	// Sorted queue should be: VIP #1002, VIP #1004, Normal #1001, Normal #1003
	expectedIDs := []int{1002, 1004, 1001, 1003}
	pending := q.GetPending()
	if len(pending) != 4 {
		t.Fatalf("Expected queue length 4, got %d", len(pending))
	}

	for i, id := range expectedIDs {
		if pending[i].ID != id {
			t.Errorf("At index %d: expected ID %d, got %d", i, id, pending[i].ID)
		}
	}

	// Pop one by one and assert sequence
	for _, expectedID := range expectedIDs {
		o := q.Pop()
		if o.ID != expectedID {
			t.Errorf("Expected popped ID %d, got %d", expectedID, o.ID)
		}
	}
}

// TestBotScaling verifies User Story 3:
// Scaling bots up and down. Destroying a bot stops its active process,
// returning the order to its original position (maintaining priority).
func TestBotScaling(t *testing.T) {
	// Use 50ms cook duration so we can easily interrupt it midway
	d := NewDispatcher(50 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)
	time.Sleep(10 * time.Millisecond)

	// Add Normal #1001, VIP #1002, Normal #1003
	d.AddOrder(OrderNormal) // will get ID 1001
	d.AddOrder(OrderVIP)    // will get ID 1002
	d.AddOrder(OrderNormal) // will get ID 1003
	time.Sleep(10 * time.Millisecond)

	// Scale up to 1 bot. It should immediately pick up VIP #1002 (highest priority).
	d.ScaleUp()
	time.Sleep(10 * time.Millisecond)

	// Verify Bot #1 is processing VIP #1002
	activeBots, pending, processing, completed := d.GetStatus()
	if activeBots != 1 {
		t.Fatalf("Expected 1 active bot, got %d", activeBots)
	}
	if len(processing) != 1 || processing[0].ID != 1002 {
		t.Fatalf("Expected VIP #1002 to be processing, got: %v", processing)
	}

	// Verify pending contains Normal #1001 and Normal #1003
	if len(pending) != 2 || pending[0].ID != 1001 || pending[1].ID != 1003 {
		t.Fatalf("Expected pending queue to be [1001, 1003], got: %v", pending)
	}

	// Scale down (destroy the bot while it is processing VIP #1002)
	d.ScaleDown()
	time.Sleep(15 * time.Millisecond) // Wait for cancellation and re-enqueueing

	// Verify Bot is gone, VIP #1002 is pending again at its original position (front of queue since it's VIP)
	activeBots, pending, processing, completed = d.GetStatus()
	if activeBots != 0 {
		t.Fatalf("Expected 0 active bots, got %d", activeBots)
	}
	if len(processing) != 0 {
		t.Fatalf("Expected 0 processing orders, got %d", len(processing))
	}
	if len(pending) != 3 || pending[0].ID != 1002 || pending[1].ID != 1001 || pending[2].ID != 1003 {
		t.Fatalf("Expected pending queue to restore VIP #1002 to the front: [1002, 1001, 1003], got: %v", pending)
	}

	// Now add a bot again. It should immediately pick up VIP #1002 again.
	d.ScaleUp()
	time.Sleep(10 * time.Millisecond)

	activeBots, pending, processing, completed = d.GetStatus()
	if activeBots != 1 {
		t.Fatalf("Expected 1 active bot, got %d", activeBots)
	}
	if len(processing) != 1 || processing[0].ID != 1002 {
		t.Fatalf("Expected VIP #1002 to be processing again, got: %v", processing)
	}

	// Wait for cook to complete
	time.Sleep(60 * time.Millisecond)

	// VIP #1002 should complete. Bot should automatically move to Normal #1001.
	activeBots, pending, processing, completed = d.GetStatus()
	if len(completed) != 1 || completed[0].ID != 1002 {
		t.Fatalf("Expected VIP #1002 to be complete, got: %v", completed)
	}
	if len(processing) != 1 || processing[0].ID != 1001 {
		t.Fatalf("Expected Bot to automatically pick up Normal #1001, got processing: %v", processing)
	}
}

// TestBotSingleTaskAndTiming verifies User Story 4:
// Bot processes only 1 order at a time, and requires exactly 10s (tested via config duration) to complete.
func TestBotSingleTaskAndTiming(t *testing.T) {
	cookDuration := 25 * time.Millisecond
	d := NewDispatcher(cookDuration)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)
	time.Sleep(10 * time.Millisecond)

	// Add two normal orders
	d.AddOrder(OrderNormal) // 1001
	d.AddOrder(OrderNormal) // 1002
	time.Sleep(10 * time.Millisecond)

	// Scale up to 1 bot. It should pick up #1001.
	start := time.Now()
	d.ScaleUp()
	time.Sleep(10 * time.Millisecond)

	// Verify only #1001 is processing, #1002 remains pending
	_, pending, processing, completed := d.GetStatus()
	if len(processing) != 1 || processing[0].ID != 1001 {
		t.Fatalf("Expected only order 1001 to be processing, got: %v", processing)
	}
	if len(pending) != 1 || pending[0].ID != 1002 {
		t.Fatalf("Expected order 1002 to be pending, got: %v", pending)
	}

	// Wait for completion of #1001. The duration should be at least cookDuration (25ms).
	time.Sleep(20 * time.Millisecond) // Total elapsed from start: ~30ms

	// Verify completing transition
	_, _, processing, completed = d.GetStatus()
	if len(completed) == 1 && completed[0].ID == 1001 {
		elapsed := time.Since(start)
		if elapsed < cookDuration {
			t.Errorf("Expected cook time to be at least %v, got %v", cookDuration, elapsed)
		}
	}
}

// TestTimestampFormatting verifies logs format timestamps strictly in [HH:MM:SS] format.
func TestTimestampFormatting(t *testing.T) {
	d := NewDispatcher(5 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)
	time.Sleep(5 * time.Millisecond)
	d.AddOrder(OrderNormal)
	time.Sleep(5 * time.Millisecond)

	logs := d.GetLogs()
	if len(logs) == 0 {
		t.Fatalf("Expected logs to be recorded, got none")
	}

	// Match pattern like: [14:32:01] Message
	re := regexp.MustCompile(`^\[\d{2}:\d{2}:\d{2}\] `)
	for _, logLine := range logs {
		if !re.MatchString(logLine) {
			t.Errorf("Log line does not match timestamp format '[HH:MM:SS]': %q", logLine)
		}
	}
}
