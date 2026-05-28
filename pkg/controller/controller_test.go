package controller

import (
	"context"
	"regexp"
	"testing"
	"time"
)

// helper to wait for a state to be achieved, avoiding fragile hardcoded sleeps
func waitForStatus(d *Dispatcher, check func() bool, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if check() {
			return true
		}
		time.Sleep(1 * time.Millisecond)
	}
	return false
}

// TestNormalOrderFlow verifies User Story 1:
// Normal order flows to PENDING area and then to COMPLETE after being processed.
func TestNormalOrderFlow(t *testing.T) {
	d := NewDispatcher(10 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)

	// Add order
	d.AddOrder(OrderNormal)

	// Wait for order to show up in pending
	ok := waitForStatus(d, func() bool {
		_, pending, _, _ := d.GetStatus()
		return len(pending) == 1 && pending[0].Type == OrderNormal && pending[0].Status == StatusPending
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Expected 1 pending normal order, check failed")
	}

	// Scale up to spawn 1 bot
	d.ScaleUp()

	// Wait for order to be picked up (PROCESSING)
	ok = waitForStatus(d, func() bool {
		_, _, processing, _ := d.GetStatus()
		return len(processing) == 1 && processing[0].ID == 1001 && processing[0].Status == StatusProcessing
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Expected order 1001 to transition to processing")
	}

	// Wait for order to be COMPLETE (cookDuration is 10ms)
	ok = waitForStatus(d, func() bool {
		_, _, _, completed := d.GetStatus()
		return len(completed) == 1 && completed[0].ID == 1001 && completed[0].Status == StatusComplete
	}, 100*time.Millisecond)
	if !ok {
		t.Fatalf("Expected order 1001 to transition to complete")
	}
}

// TestVIPPriorityAndFIFO verifies User Story 2:
// VIP orders are processed first before all normal orders. If there is existing VIP order,
// new VIP order queues behind it. Same for normal orders.
func TestVIPPriorityAndFIFO(t *testing.T) {
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

	// Add Normal #1001, VIP #1002, Normal #1003
	d.AddOrder(OrderNormal) // will get ID 1001
	d.AddOrder(OrderVIP)    // will get ID 1002
	d.AddOrder(OrderNormal) // will get ID 1003

	// Wait for all 3 orders to be pending
	ok := waitForStatus(d, func() bool {
		_, pending, _, _ := d.GetStatus()
		return len(pending) == 3
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Orders failed to register")
	}

	// Scale up to 1 bot. It should immediately pick up VIP #1002 (highest priority).
	d.ScaleUp()

	// Wait for Bot #1 to pick up VIP #1002
	ok = waitForStatus(d, func() bool {
		activeBots, pending, processing, _ := d.GetStatus()
		return activeBots == 1 && len(processing) == 1 && processing[0].ID == 1002 && len(pending) == 2
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Expected VIP #1002 to be processing by 1 active bot")
	}

	// Scale down (destroy the bot while it is processing VIP #1002)
	d.ScaleDown()

	// Wait for Bot to be gone, and VIP #1002 to return to front of pending queue: [1002, 1001, 1003]
	ok = waitForStatus(d, func() bool {
		activeBots, pending, processing, _ := d.GetStatus()
		return activeBots == 0 && len(processing) == 0 && len(pending) == 3 &&
			pending[0].ID == 1002 && pending[1].ID == 1001 && pending[2].ID == 1003
	}, 100*time.Millisecond)
	if !ok {
		_, pending, _, _ := d.GetStatus()
		t.Fatalf("Expected VIP #1002 to return to front of queue, queue was: %v", pending)
	}

	// Now add a bot again. It should immediately pick up VIP #1002 again.
	d.ScaleUp()

	// Wait for Bot #1 to pick up VIP #1002 again
	ok = waitForStatus(d, func() bool {
		activeBots, _, processing, _ := d.GetStatus()
		return activeBots == 1 && len(processing) == 1 && processing[0].ID == 1002
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Expected VIP #1002 to be processing again")
	}

	// Wait for cook to complete and bot to automatically pick up Normal #1001
	ok = waitForStatus(d, func() bool {
		_, _, processing, completed := d.GetStatus()
		return len(completed) == 1 && completed[0].ID == 1002 &&
			len(processing) == 1 && processing[0].ID == 1001
	}, 150*time.Millisecond)
	if !ok {
		_, _, processing, completed := d.GetStatus()
		t.Fatalf("Expected VIP completed and Normal processing, got processing: %v, completed: %v", processing, completed)
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

	// Add two normal orders
	d.AddOrder(OrderNormal) // 1001
	d.AddOrder(OrderNormal) // 1002

	// Wait for both to be pending
	ok := waitForStatus(d, func() bool {
		_, pending, _, _ := d.GetStatus()
		return len(pending) == 2
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Orders failed to register")
	}

	// Scale up to 1 bot. It should pick up #1001.
	start := time.Now()
	d.ScaleUp()

	// Wait for #1001 to start processing
	ok = waitForStatus(d, func() bool {
		_, pending, processing, _ := d.GetStatus()
		return len(processing) == 1 && processing[0].ID == 1001 && len(pending) == 1 && pending[0].ID == 1002
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Expected only order 1001 to start processing")
	}

	// Wait for completion of #1001 and measure exact elapsed time
	ok = waitForStatus(d, func() bool {
		_, _, _, completed := d.GetStatus()
		return len(completed) == 1 && completed[0].ID == 1001
	}, 100*time.Millisecond)

	if !ok {
		t.Fatalf("Expected order 1001 to complete within timeout")
	}

	elapsed := time.Since(start)

	// Assert the timing is robust and within a reasonable execution window
	if elapsed < cookDuration {
		t.Errorf("Expected cook time to be at least %v, got %v", cookDuration, elapsed)
	}
	// Give a 15ms buffer for thread scheduling/overhead on slow machines
	maxExpected := cookDuration + 15*time.Millisecond
	if elapsed > maxExpected {
		t.Errorf("Expected cook time to be near %v (with scheduling tolerance), but took too long: %v", cookDuration, elapsed)
	}
}

// TestTimestampFormatting verifies logs format timestamps strictly in [HH:MM:SS] format.
func TestTimestampFormatting(t *testing.T) {
	d := NewDispatcher(5 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)
	d.AddOrder(OrderNormal)

	// Wait for at least one log line to appear
	ok := waitForStatus(d, func() bool {
		return len(d.GetLogs()) > 0
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Expected logs to be recorded, got none")
	}

	logs := d.GetLogs()
	// Match pattern like: [14:32:01] Message
	re := regexp.MustCompile(`^\[\d{2}:\d{2}:\d{2}\] `)
	for _, logLine := range logs {
		if !re.MatchString(logLine) {
			t.Errorf("Log line does not match timestamp format '[HH:MM:SS]': %q", logLine)
		}
	}
}
