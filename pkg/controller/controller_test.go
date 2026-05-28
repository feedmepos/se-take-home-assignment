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

// TestOrderIDIncrement verifies Requirement 3: The order number should be unique and increasing.
func TestOrderIDIncrement(t *testing.T) {
	d := NewDispatcher(5 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)

	// Add 5 orders of mixed types
	d.AddOrder(OrderNormal)
	d.AddOrder(OrderVIP)
	d.AddOrder(OrderNormal)
	d.AddOrder(OrderVIP)
	d.AddOrder(OrderNormal)

	// Wait for all 5 orders to register
	ok := waitForStatus(d, func() bool {
		_, pending, _, _ := d.GetStatus()
		return len(pending) == 5
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Failed to register 5 orders")
	}

	_, pending, _, _ := d.GetStatus()
	// Because of sorting, VIPs will be first: [1002 (VIP), 1004 (VIP), 1001 (Normal), 1003 (Normal), 1005 (Normal)]
	// Let's assert all generated IDs are strictly unique and range from 1001 to 1005
	idMap := make(map[int]bool)
	for _, o := range pending {
		if o.ID < 1001 || o.ID > 1005 {
			t.Errorf("Expected ID between 1001 and 1005, got %d", o.ID)
		}
		idMap[o.ID] = true
	}
	if len(idMap) != 5 {
		t.Errorf("Expected 5 unique IDs, got %d", len(idMap))
	}
}

// TestBotIdleStateTransition verifies Requirement 5: Bot becomes IDLE if no orders, starts processing on new order.
func TestBotIdleStateTransition(t *testing.T) {
	d := NewDispatcher(10 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)

	// Scale up to 1 bot. Since no orders exist, it should become IDLE immediately.
	d.ScaleUp()

	// Wait for bot to register and be IDLE
	ok := waitForStatus(d, func() bool {
		activeBots, pending, processing, _ := d.GetStatus()
		return activeBots == 1 && len(pending) == 0 && len(processing) == 0
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Bot did not register or did not become IDLE")
	}

	// Add an order. The IDLE bot should immediately wake up and start processing it.
	d.AddOrder(OrderNormal)

	// Wait for processing
	ok = waitForStatus(d, func() bool {
		_, _, processing, _ := d.GetStatus()
		return len(processing) == 1 && processing[0].ID == 1001
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("IDLE bot failed to pick up the new order")
	}
}

// TestScaleDownNewestBot verifies Requirement 6: When '- Bot' clicked, the newest bot should be destroyed.
func TestScaleDownNewestBot(t *testing.T) {
	d := NewDispatcher(100 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)

	// Scale up 3 times to spawn Bot 1, Bot 2, Bot 3
	d.ScaleUp()
	d.ScaleUp()
	d.ScaleUp()

	// Wait for all 3 bots to be active
	ok := waitForStatus(d, func() bool {
		activeBots, _, _, _ := d.GetStatus()
		return activeBots == 3
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Failed to spawn 3 active bots")
	}

	// Scale down. This should destroy Bot 3 (newest).
	d.ScaleDown()

	// Wait for 2 bots.
	ok = waitForStatus(d, func() bool {
		activeBots, _, _, _ := d.GetStatus()
		return activeBots == 2
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Failed to scale down to 2 bots")
	}

	// Verify that Bot 3 is gone, but Bot 1 and Bot 2 remain.
	d.statusMu.RLock()
	bots := d.botList
	d.statusMu.RUnlock()

	hasBot1 := false
	hasBot2 := false
	hasBot3 := false
	for _, b := range bots {
		if b.ID == 1 {
			hasBot1 = true
		}
		if b.ID == 2 {
			hasBot2 = true
		}
		if b.ID == 3 {
			hasBot3 = true
		}
	}
	if !hasBot1 || !hasBot2 || hasBot3 {
		t.Errorf("Expected bots 1 and 2 to remain, and bot 3 to be destroyed. Got Bot1: %v, Bot2: %v, Bot3: %v", hasBot1, hasBot2, hasBot3)
	}

	// Scale down again. This should destroy Bot 2.
	d.ScaleDown()

	ok = waitForStatus(d, func() bool {
		activeBots, _, _, _ := d.GetStatus()
		return activeBots == 1
	}, 50*time.Millisecond)
	if !ok {
		t.Fatalf("Failed to scale down to 1 bot")
	}

	d.statusMu.RLock()
	bots = d.botList
	d.statusMu.RUnlock()

	hasBot1 = false
	hasBot2 = false
	for _, b := range bots {
		if b.ID == 1 {
			hasBot1 = true
		}
		if b.ID == 2 {
			hasBot2 = true
		}
	}
	if !hasBot1 || hasBot2 {
		t.Errorf("Expected bot 1 to remain and bot 2 to be destroyed. Got Bot1: %v, Bot2: %v", hasBot1, hasBot2)
	}
}

// TestMultiBotLoadBalancing verifies concurrency load balancing and scheduling rules across multiple bots.
func TestMultiBotLoadBalancing(t *testing.T) {
	// 50ms cook duration to give stable testing windows
	d := NewDispatcher(50 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go d.Start(ctx)

	// 1. Add 2 Normal and 2 VIP orders first (while 0 bots are active)
	// They will get IDs: 1001 (Normal), 1002 (VIP), 1003 (Normal), 1004 (VIP)
	d.AddOrder(OrderNormal)
	d.AddOrder(OrderVIP)
	d.AddOrder(OrderNormal)
	d.AddOrder(OrderVIP)

	// Wait for all 4 orders to register in PENDING queue
	ok := waitForStatus(d, func() bool {
		_, pending, _, _ := d.GetStatus()
		return len(pending) == 4
	}, 100*time.Millisecond)
	if !ok {
		t.Fatalf("Orders failed to register")
	}

	// 2. Scale up Bot 1. It should immediately pick up VIP #1002.
	d.ScaleUp()
	ok = waitForStatus(d, func() bool {
		activeBots, _, processing, _ := d.GetStatus()
		return activeBots == 1 && len(processing) == 1 && processing[0].ID == 1002
	}, 100*time.Millisecond)
	if !ok {
		_, _, processing, _ := d.GetStatus()
		t.Fatalf("Expected Bot 1 to pick up VIP #1002, got: %v", processing)
	}

	// 3. Scale up Bot 2. Since Bot 1 is busy, Bot 2 must pick up VIP #1004.
	d.ScaleUp()
	ok = waitForStatus(d, func() bool {
		activeBots, pending, processing, _ := d.GetStatus()
		return activeBots == 2 && len(processing) == 2 && len(pending) == 2 &&
			(processing[0].ID == 1002 || processing[0].ID == 1004) &&
			(processing[1].ID == 1002 || processing[1].ID == 1004) &&
			(pending[0].ID == 1001 && pending[1].ID == 1003)
	}, 100*time.Millisecond)
	if !ok {
		_, pending, processing, _ := d.GetStatus()
		t.Fatalf("Expected 2 bots processing VIP orders 1002/1004. Proc: %v, Pend: %v", processing, pending)
	}

	// 4. Wait for VIP orders to complete and bots to automatically pick up the 2 Normal orders
	ok = waitForStatus(d, func() bool {
		_, pending, processing, completed := d.GetStatus()
		return len(completed) == 2 && len(processing) == 2 && len(pending) == 0 &&
			(completed[0].ID == 1002 || completed[0].ID == 1004) &&
			(processing[0].ID == 1001 || processing[0].ID == 1003)
	}, 150*time.Millisecond)
	if !ok {
		_, pending, processing, completed := d.GetStatus()
		t.Fatalf("Expected VIP completed and Normal processing. Proc: %v, Pend: %v, Comp: %v", processing, pending, completed)
	}
}
