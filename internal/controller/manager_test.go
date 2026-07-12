package controller

import (
	"bytes"
	"sync"
	"testing"
	"time"
)

func newTestManager() *Manager {
	return NewManager(50*time.Millisecond, &bytes.Buffer{})
}

func TestOrderIDsUniqueAndIncreasing(t *testing.T) {
	m := newTestManager()
	o1 := m.AddNormalOrder()
	o2 := m.AddVIPOrder()
	o3 := m.AddNormalOrder()

	if !(o1.ID < o2.ID && o2.ID < o3.ID) {
		t.Fatalf("order IDs not strictly increasing: %d %d %d", o1.ID, o2.ID, o3.ID)
	}
}

func TestVIPPriorityOrdering(t *testing.T) {
	m := newTestManager()
	n1 := m.AddNormalOrder() // pending: [n1]
	v1 := m.AddVIPOrder()    // pending: [v1, n1]
	n2 := m.AddNormalOrder() // pending: [v1, n1, n2]
	v2 := m.AddVIPOrder()    // pending: [v1, v2, n1, n2]

	s := m.Status()
	got := []int{}
	for _, o := range s.Pending {
		got = append(got, o.ID)
	}
	want := []int{v1.ID, v2.ID, n1.ID, n2.ID}
	if len(got) != len(want) {
		t.Fatalf("pending len = %d, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("pending order = %v, want %v", got, want)
		}
	}
}

func TestBotProcessesOrderToComplete(t *testing.T) {
	m := newTestManager()
	o := m.AddNormalOrder()
	m.AddBot()

	waitFor(t, 1*time.Second, func() bool {
		return len(m.Status().Completed) == 1
	})

	s := m.Status()
	if len(s.Pending) != 0 {
		t.Fatalf("expected no pending, got %d", len(s.Pending))
	}
	if s.Completed[0].ID != o.ID || s.Completed[0].Status != StatusComplete {
		t.Fatalf("completed order mismatch: %+v", s.Completed[0])
	}
	m.Stop()
}

func TestBotIdleWhenNoOrders(t *testing.T) {
	m := newTestManager()
	m.AddBot()
	time.Sleep(100 * time.Millisecond)

	// Adding an order after the bot went idle must still get processed.
	m.AddNormalOrder()
	waitFor(t, 1*time.Second, func() bool {
		return len(m.Status().Completed) == 1
	})
	m.Stop()
}

func TestAddBotPicksUpPendingImmediately(t *testing.T) {
	m := newTestManager()
	m.AddNormalOrder()
	m.AddNormalOrder()
	// No bots yet; both stay pending.
	if len(m.Status().Pending) != 2 {
		t.Fatalf("expected 2 pending before bots")
	}
	m.AddBot()
	m.AddBot()
	waitFor(t, 1*time.Second, func() bool {
		return len(m.Status().Completed) == 2
	})
	m.Stop()
}

func TestRemoveBotReturnsOrderToQueue(t *testing.T) {
	// Long processing so the order stays in progress while we remove the bot.
	m := NewManager(2*time.Second, &bytes.Buffer{})
	v := m.AddVIPOrder()
	n := m.AddNormalOrder()
	m.AddBot()

	// Wait until the VIP order is being processed.
	waitFor(t, 1*time.Second, func() bool {
		s := m.Status()
		return len(s.Pending) == 1 && s.Pending[0].ID == n.ID
	})

	m.RemoveBot()

	// VIP order returns and keeps its priority position ahead of the normal one.
	waitFor(t, 1*time.Second, func() bool {
		s := m.Status()
		return len(s.Pending) == 2
	})
	s := m.Status()
	if s.Pending[0].ID != v.ID || s.Pending[1].ID != n.ID {
		t.Fatalf("expected VIP #%d ahead of Normal #%d, got %+v", v.ID, n.ID, s.Pending)
	}
	if s.BotCount != 0 {
		t.Fatalf("expected 0 bots, got %d", s.BotCount)
	}
}

func TestConcurrentAddOrdersNoRace(t *testing.T) {
	m := newTestManager()
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			m.AddNormalOrder()
		}()
	}
	wg.Wait()
	if len(m.Status().Pending) != 20 {
		t.Fatalf("expected 20 pending, got %d", len(m.Status().Pending))
	}
}

func waitFor(t *testing.T, timeout time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("condition not met within %s", timeout)
}
