package bot

import (
	"sync"
	"testing"
	"time"

	"github.com/se-take-home-assignment/internal/order"
)

// mockQueue implements queue.OrderQueue for unit testing bots in isolation.
// Uses a buffered channel internally to avoid the race window between
// Dequeue registering a waiter and Enqueue signalling it.
type mockQueue struct {
	orders    chan *order.Order // buffered, capacity 1
	recycled  []*order.Order
	completed []*order.Order
	mu        sync.Mutex
}

func newMockQueue() *mockQueue {
	return &mockQueue{
		orders: make(chan *order.Order, 1),
	}
}

func (m *mockQueue) Enqueue(o *order.Order) {
	m.orders <- o
}

func (m *mockQueue) Dequeue(stopCh <-chan struct{}) *order.Order {
	select {
	case <-stopCh:
		return nil
	case o := <-m.orders:
		return o
	}
}

func (m *mockQueue) RecycleOrder(o *order.Order) {
	m.mu.Lock()
	m.recycled = append(m.recycled, o)
	m.mu.Unlock()
}

func (m *mockQueue) CompleteOrder(o *order.Order) {
	m.mu.Lock()
	m.completed = append(m.completed, o)
	m.mu.Unlock()
}

func (m *mockQueue) PendingOrders() []*order.Order    { return nil }
func (m *mockQueue) ProcessingOrders() []*order.Order { return nil }
func (m *mockQueue) CompletedOrders() []*order.Order  { return nil }

func (m *mockQueue) recycledOrders() []*order.Order {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*order.Order, len(m.recycled))
	copy(out, m.recycled)
	return out
}

func (m *mockQueue) completedOrders() []*order.Order {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*order.Order, len(m.completed))
	copy(out, m.completed)
	return out
}

func waitForState(b *Bot, expected State, timeout time.Duration) bool {
	deadline := time.After(timeout)
	for {
		if b.State == expected {
			return true
		}
		select {
		case <-time.After(5 * time.Millisecond):
		case <-deadline:
			return false
		}
	}
}

// ============================================================
// AddBot
// ============================================================

func TestAddBot_IncrementsID(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)
	t.Cleanup(mgr.Shutdown)

	b1 := mgr.AddBot()
	b2 := mgr.AddBot()

	if b1.ID != 1 {
		t.Errorf("expected first bot ID=1, got %d", b1.ID)
	}
	if b2.ID != 2 {
		t.Errorf("expected second bot ID=2, got %d", b2.ID)
	}
}

func TestAddBot_AppearsInBots(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)
	t.Cleanup(mgr.Shutdown)

	b := mgr.AddBot()

	bots := mgr.Bots()
	if len(bots) != 1 {
		t.Fatalf("expected 1 bot, got %d", len(bots))
	}
	if bots[0].ID != b.ID {
		t.Errorf("expected bot ID=%d, got %d", b.ID, bots[0].ID)
	}
}

func TestAddBot_BotEntersIdleState(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)
	t.Cleanup(mgr.Shutdown)

	b := mgr.AddBot()

	if !waitForState(b, Idle, time.Second) {
		t.Errorf("expected bot IDLE, got %s", b.State)
	}
}

// ============================================================
// RemoveBot
// ============================================================

func TestRemoveBot_RemovesNewest(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)
	t.Cleanup(mgr.Shutdown)

	b1 := mgr.AddBot()
	b2 := mgr.AddBot()

	removed := mgr.RemoveBot()
	if removed == nil {
		t.Fatal("expected non-nil removed bot")
	}
	if removed.ID != b2.ID {
		t.Errorf("expected removed bot ID=%d (newest), got %d", b2.ID, removed.ID)
	}

	// b1 should still be present
	bots := mgr.Bots()
	if len(bots) != 1 {
		t.Fatalf("expected 1 bot remaining, got %d", len(bots))
	}
	if bots[0].ID != b1.ID {
		t.Errorf("expected remaining bot ID=%d, got %d", b1.ID, bots[0].ID)
	}
}

func TestRemoveBot_ReturnsNilWhenEmpty(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)

	removed := mgr.RemoveBot()
	if removed != nil {
		t.Errorf("expected nil from empty manager, got %v", removed)
	}
}

func TestRemoveBot_BotExitsAndGoesToStopped(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)

	b := mgr.AddBot()
	if !waitForState(b, Idle, time.Second) {
		t.Fatalf("bot should be IDLE before removal")
	}

	mgr.RemoveBot()

	if !waitForState(b, Stopped, time.Second) {
		t.Errorf("expected bot STOPPED after removal, got %s", b.State)
	}

	// Bot should no longer be in manager's list
	if len(mgr.Bots()) != 0 {
		t.Error("manager should have no bots after removal")
	}
}

// ============================================================
// Bots
// ============================================================

func TestBots_ReturnsCopy(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)
	t.Cleanup(mgr.Shutdown)

	mgr.AddBot()
	bots := mgr.Bots()

	// Mutate the copy
	bots[0] = nil

	bots2 := mgr.Bots()
	if len(bots2) != 1 || bots2[0] == nil {
		t.Error("Bots() should return a copy, mutation must not affect original")
	}
}

func TestBots_Empty(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)

	bots := mgr.Bots()
	if len(bots) != 0 {
		t.Errorf("expected empty bots, got %d", len(bots))
	}
}

// ============================================================
// Bot.Run — dequeue returns order
// ============================================================

func TestBotRun_DequeueReturnsOrder_EntersProcessing(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)
	t.Cleanup(mgr.Shutdown)

	b := mgr.AddBot()
	if !waitForState(b, Idle, time.Second) {
		t.Fatalf("bot should be IDLE before order")
	}

	// Feed an order to the waiting bot
	o := order.NewNormal()
	mq.Enqueue(o)

	// Bot should pick it up and enter Processing
	if !waitForState(b, Processing, time.Second) {
		t.Fatalf("expected PROCESSING, got %s", b.State)
	}
	if b.CurrentOrder == nil || b.CurrentOrder.ID() != o.ID() {
		t.Errorf("expected CurrentOrder %d, got %v", o.ID(), b.CurrentOrder)
	}
}

func TestBotRun_HandlerCalledOnProcessing(t *testing.T) {
	mq := newMockQueue()
	events := make(chan string, 2)
	handler := func(eventType string, o *order.Order, botID int) {
		events <- eventType
	}
	mgr := NewManager(mq, handler)
	t.Cleanup(mgr.Shutdown)

	b := mgr.AddBot()
	if !waitForState(b, Idle, time.Second) {
		t.Fatalf("bot should be IDLE")
	}

	mq.Enqueue(order.NewNormal())

	select {
	case event := <-events:
		if event != "processing" {
			t.Errorf("expected 'processing', got '%s'", event)
		}
	case <-time.After(time.Second):
		t.Fatal("handler was not called for processing")
	}
}

// ============================================================
// Bot.Run — stopCh during processing → RecycleOrder
// ============================================================

func TestBotRun_StopChDuringProcessing_RecyclesOrder(t *testing.T) {
	mq := newMockQueue()
	events := make(chan string, 2)
	handler := func(eventType string, o *order.Order, botID int) {
		events <- eventType
	}
	mgr := NewManager(mq, handler)
	t.Cleanup(mgr.Shutdown)

	b := mgr.AddBot()
	if !waitForState(b, Idle, time.Second) {
		t.Fatalf("bot should be IDLE")
	}

	o := order.NewNormal()
	mq.Enqueue(o)

	// Wait for processing
	if !waitForState(b, Processing, time.Second) {
		t.Fatalf("expected PROCESSING, got %s", b.State)
	}
	<-events // consume "processing"

	// Remove while processing → stopCh fires
	mgr.RemoveBot()

	// Should get "recycled" event
	select {
	case event := <-events:
		if event != "recycled" {
			t.Errorf("expected 'recycled', got '%s'", event)
		}
	case <-time.After(time.Second):
		t.Fatal("handler was not called for recycled")
	}

	// Verify RecycleOrder was called on the queue
	recycled := mq.recycledOrders()
	if len(recycled) != 1 || recycled[0].ID() != o.ID() {
		t.Errorf("expected RecycleOrder called with order %d, got %v", o.ID(), recycled)
	}

	// Bot should be Stopped
	if !waitForState(b, Stopped, time.Second) {
		t.Errorf("expected STOPPED after recycle, got %s", b.State)
	}
}

// ============================================================
// Bot.Run — stopCh during idle (Dequeue returns nil)
// ============================================================

func TestBotRun_IdleStopCh_Exits(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)

	b := mgr.AddBot()
	if !waitForState(b, Idle, time.Second) {
		t.Fatalf("bot should be IDLE")
	}

	mgr.RemoveBot()

	if !waitForState(b, Stopped, time.Second) {
		t.Errorf("expected STOPPED, got %s", b.State)
	}
}

// ============================================================
// Bot.Run — nil handler does not panic
// ============================================================

func TestBotRun_NilHandlerNoPanic(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil) // nil handler
	t.Cleanup(mgr.Shutdown)

	b := mgr.AddBot()
	if !waitForState(b, Idle, time.Second) {
		t.Fatalf("bot should be IDLE")
	}

	// Feed an order → should process without panic
	mq.Enqueue(order.NewNormal())
	if !waitForState(b, Processing, time.Second) {
		t.Fatalf("expected PROCESSING with nil handler")
	}

	// Remove → should recycle without panic
	mgr.RemoveBot()
	if !waitForState(b, Stopped, time.Second) {
		t.Errorf("expected STOPPED with nil handler, got %s", b.State)
	}
}

// ============================================================
// Shutdown
// ============================================================

func TestShutdown_StopsAllBots(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)

	b1 := mgr.AddBot()
	b2 := mgr.AddBot()
	if !waitForState(b1, Idle, time.Second) || !waitForState(b2, Idle, time.Second) {
		t.Fatal("bots should be IDLE")
	}

	mgr.Shutdown()

	if !waitForState(b1, Stopped, time.Second) {
		t.Errorf("b1 expected STOPPED, got %s", b1.State)
	}
	if !waitForState(b2, Stopped, time.Second) {
		t.Errorf("b2 expected STOPPED, got %s", b2.State)
	}
	if len(mgr.Bots()) != 0 {
		t.Error("manager should have no bots after Shutdown")
	}
}

func TestShutdown_MultipleCallsSafe(t *testing.T) {
	mq := newMockQueue()
	mgr := NewManager(mq, nil)

	mgr.AddBot()
	mgr.Shutdown()
	// Second call should not panic
	mgr.Shutdown()
}

// ============================================================
// State.String
// ============================================================

func TestState_String(t *testing.T) {
	tests := []struct {
		state State
		want  string
	}{
		{Idle, "IDLE"},
		{Processing, "PROCESSING"},
		{Stopped, "STOPPED"},
		{State(99), "UNKNOWN"},
	}

	for _, tt := range tests {
		if got := tt.state.String(); got != tt.want {
			t.Errorf("State(%d).String() = %q, want %q", tt.state, got, tt.want)
		}
	}
}
