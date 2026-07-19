package usecase

import (
	"testing"
	"time"

	"github.com/KhanitthaK/feedme-backend-service/internal/domain"
)

// shortDur is used where we want orders to complete quickly.
const shortDur = 20 * time.Millisecond

// longDur is used where we need an order to stay PROCESSING while we act on it.
const longDur = 2 * time.Second

// eventually polls cond until it is true or the timeout elapses.
func eventually(t *testing.T, timeout time.Duration, cond func() bool) bool {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return true
		}
		time.Sleep(2 * time.Millisecond)
	}
	return cond()
}

func pendingIDs(c *OrderController) []int {
	s := c.GetState()
	ids := make([]int, 0, len(s.Pending))
	for _, o := range s.Pending {
		ids = append(ids, o.ID)
	}
	return ids
}

func TestOrderIDsUniqueAndIncreasing(t *testing.T) {
	c := NewOrderController(NewRealClock(), longDur) // no bots -> nothing processed
	types := []domain.OrderType{
		domain.OrderTypeNormal, domain.OrderTypeVIP, domain.OrderTypeNormal,
		domain.OrderTypeVIP, domain.OrderTypeNormal,
	}
	var got []int
	for _, ty := range types {
		o, err := c.CreateOrder(ty)
		if err != nil {
			t.Fatalf("CreateOrder(%s) error: %v", ty, err)
		}
		got = append(got, o.ID)
	}
	want := []int{1, 2, 3, 4, 5}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("ids = %v, want %v", got, want)
		}
	}
}

func TestCreateOrderInvalidType(t *testing.T) {
	c := NewOrderController(NewRealClock(), longDur)
	if _, err := c.CreateOrder(domain.OrderType("GOLD")); err == nil {
		t.Fatal("expected error for invalid order type, got nil")
	}
}

func TestPriorityInsertion(t *testing.T) {
	// No bots so orders stay pending; verify queue ordering.
	c := NewOrderController(NewRealClock(), longDur)

	// Sequence of (type) creations and expected pending id order after each.
	steps := []struct {
		typ  domain.OrderType
		want []int
	}{
		{domain.OrderTypeNormal, []int{1}},              // [N1]
		{domain.OrderTypeNormal, []int{1, 2}},           // [N1,N2]
		{domain.OrderTypeVIP, []int{3, 1, 2}},           // VIP jumps ahead of NORMALs
		{domain.OrderTypeVIP, []int{3, 4, 1, 2}},        // VIP after existing VIPs
		{domain.OrderTypeNormal, []int{3, 4, 1, 2, 5}},  // NORMAL appended to end
	}
	for i, st := range steps {
		if _, err := c.CreateOrder(st.typ); err != nil {
			t.Fatalf("step %d CreateOrder error: %v", i, err)
		}
		got := pendingIDs(c)
		if len(got) != len(st.want) {
			t.Fatalf("step %d pending = %v, want %v", i, got, st.want)
		}
		for j := range st.want {
			if got[j] != st.want[j] {
				t.Fatalf("step %d pending = %v, want %v", i, got, st.want)
			}
		}
	}
}

func TestAddBotProcessesCompletesAndIdles(t *testing.T) {
	c := NewOrderController(NewRealClock(), shortDur)
	o, _ := c.CreateOrder(domain.OrderTypeNormal)

	c.AddBot()

	// Order should complete.
	if !eventually(t, time.Second, func() bool {
		s := c.GetState()
		return len(s.Complete) == 1 && s.Complete[0].ID == o.ID
	}) {
		t.Fatalf("order did not complete: %+v", c.GetState())
	}

	// Bot should return to IDLE and nothing should be processing.
	if !eventually(t, time.Second, func() bool {
		s := c.GetState()
		return len(s.Processing) == 0 && len(s.Bots) == 1 &&
			s.Bots[0].Bot.Status == domain.BotStatusIdle
	}) {
		t.Fatalf("bot did not go idle: %+v", c.GetState())
	}

	// Completed order must carry a CompletedAt timestamp.
	if got := c.GetState().Complete[0]; got.CompletedAt == nil {
		t.Fatal("completed order missing CompletedAt")
	}

	// A second order should be picked up by the same idle bot and complete.
	o2, _ := c.CreateOrder(domain.OrderTypeVIP)
	if !eventually(t, time.Second, func() bool {
		s := c.GetState()
		return len(s.Complete) == 2 && s.Complete[1].ID == o2.ID
	}) {
		t.Fatalf("second order did not complete: %+v", c.GetState())
	}
}

func TestConcurrentBotsNoDuplicationOrLoss(t *testing.T) {
	c := NewOrderController(NewRealClock(), shortDur)

	const n = 12
	for i := 0; i < n; i++ {
		if i%2 == 0 {
			c.CreateOrder(domain.OrderTypeNormal)
		} else {
			c.CreateOrder(domain.OrderTypeVIP)
		}
	}
	// Three bots race to drain the queue.
	c.AddBot()
	c.AddBot()
	c.AddBot()

	if !eventually(t, 3*time.Second, func() bool {
		return len(c.GetState().Complete) == n
	}) {
		t.Fatalf("not all orders completed: %+v", c.GetState())
	}

	// Every id 1..n must appear exactly once across complete — no loss/dupes.
	seen := map[int]int{}
	for _, o := range c.GetState().Complete {
		seen[o.ID]++
	}
	if len(seen) != n {
		t.Fatalf("expected %d unique completed orders, got %d (%v)", n, len(seen), seen)
	}
	for id := 1; id <= n; id++ {
		if seen[id] != 1 {
			t.Fatalf("order %d completed %d times, want 1", id, seen[id])
		}
	}
}

func TestRemoveBotWhileProcessingRequeuesAtPriority(t *testing.T) {
	c := NewOrderController(NewRealClock(), longDur) // long so it stays PROCESSING

	c.AddBot()
	vip, _ := c.CreateOrder(domain.OrderTypeVIP) // bot grabs this VIP

	// Wait until the bot is actually processing the VIP order.
	if !eventually(t, time.Second, func() bool {
		s := c.GetState()
		return len(s.Processing) == 1 && s.Processing[0].ID == vip.ID
	}) {
		t.Fatalf("bot never started processing: %+v", c.GetState())
	}

	// Queue a NORMAL behind it while the VIP is being cooked.
	normal, _ := c.CreateOrder(domain.OrderTypeNormal)

	// Remove the bot mid-processing.
	id, err := c.RemoveBot()
	if err != nil {
		t.Fatalf("RemoveBot error: %v", err)
	}
	if id != 1 {
		t.Fatalf("removed bot id = %d, want 1", id)
	}

	s := c.GetState()
	if len(s.Bots) != 0 {
		t.Fatalf("expected 0 bots after removal, got %d", len(s.Bots))
	}
	if len(s.Processing) != 0 {
		t.Fatalf("expected nothing processing after removal, got %v", s.Processing)
	}
	// The requeued VIP must be at the FRONT (before the NORMAL), status PENDING.
	if len(s.Pending) != 2 || s.Pending[0].ID != vip.ID || s.Pending[1].ID != normal.ID {
		t.Fatalf("pending = %+v, want [VIP #%d, NORMAL #%d]", s.Pending, vip.ID, normal.ID)
	}
	if s.Pending[0].Status != domain.OrderStatusPending {
		t.Fatalf("requeued order status = %s, want PENDING", s.Pending[0].Status)
	}
}

func TestRemoveIdleBotOK(t *testing.T) {
	c := NewOrderController(NewRealClock(), shortDur)
	c.AddBot() // idle, no orders

	if !eventually(t, time.Second, func() bool {
		s := c.GetState()
		return len(s.Bots) == 1 && s.Bots[0].Bot.Status == domain.BotStatusIdle
	}) {
		t.Fatal("bot never became idle")
	}
	if _, err := c.RemoveBot(); err != nil {
		t.Fatalf("RemoveBot(idle) error: %v", err)
	}
	if len(c.GetState().Bots) != 0 {
		t.Fatal("bot was not removed")
	}
}

func TestRemoveBotWhenNoneReturnsError(t *testing.T) {
	c := NewOrderController(NewRealClock(), shortDur)
	if _, err := c.RemoveBot(); err != ErrNoBots {
		t.Fatalf("RemoveBot() error = %v, want ErrNoBots", err)
	}
}

func TestResetClearsEverything(t *testing.T) {
	c := NewOrderController(NewRealClock(), longDur)
	c.CreateOrder(domain.OrderTypeVIP)
	c.AddBot()
	c.Reset()

	s := c.GetState()
	if len(s.Pending) != 0 || len(s.Processing) != 0 || len(s.Complete) != 0 || len(s.Bots) != 0 {
		t.Fatalf("state not cleared after reset: %+v", s)
	}
	// Counter reset -> next order id starts back at 1.
	o, _ := c.CreateOrder(domain.OrderTypeNormal)
	if o.ID != 1 {
		t.Fatalf("order id after reset = %d, want 1", o.ID)
	}
}
