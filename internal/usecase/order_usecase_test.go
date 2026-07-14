package usecase_test

import (
	"sync"
	"testing"
	"time"

	"feedme-order-controller/internal/core"
	"feedme-order-controller/internal/usecase"
)

// processingTime used across tests: short enough to keep the suite fast,
// long enough to reliably observe intermediate PROCESSING states.
const testProcessingTime = 30 * time.Millisecond

// waitFor polls cond until it returns true or timeout elapses, failing the
// test if the timeout is reached. Never use a bare sleep as an assertion.
func waitFor(t *testing.T, timeout time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(2 * time.Millisecond)
	}
	if !cond() {
		t.Fatalf("condition not met within %s", timeout)
	}
}

// noopLogger discards all log lines; used so tests don't spam stdout.
type noopLogger struct{}

func (noopLogger) Logf(format string, args ...any) {}

// fakeClock is a trivial Clock fake; New() stores the clock but no method
// under test currently consults it.
type fakeClock struct{}

func (fakeClock) Now() time.Time { return time.Time{} }

// fakeOrderRepo is a local, test-only fake implementing usecase.OrderRepository.
// It maintains priority ordering (VIP ahead of Normal, FIFO within a kind)
// and implements the blocking Dequeue contract using a mutex + sync.Cond:
// waiters re-check both the pending queue and their stop channel each time
// they wake, so Broadcast (via Enqueue/WakeAll) always causes a re-check.
type fakeOrderRepo struct {
	mu        sync.Mutex
	cond      *sync.Cond
	nextID    int
	pending   []core.Order
	completed []core.Order
}

func newFakeOrderRepo() *fakeOrderRepo {
	r := &fakeOrderRepo{}
	r.cond = sync.NewCond(&r.mu)
	return r
}

func (r *fakeOrderRepo) NextOrderID() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.nextID++
	return r.nextID
}

// insertLocked inserts o preserving priority order (VIP ahead of Normal,
// FIFO within a kind). Caller must hold r.mu.
func (r *fakeOrderRepo) insertLocked(o core.Order) {
	if o.Kind == core.KindVIP {
		idx := len(r.pending)
		for i, p := range r.pending {
			if p.Kind != core.KindVIP {
				idx = i
				break
			}
		}
		r.pending = append(r.pending, core.Order{})
		copy(r.pending[idx+1:], r.pending[idx:])
		r.pending[idx] = o
		return
	}
	r.pending = append(r.pending, o)
}

func (r *fakeOrderRepo) Enqueue(o core.Order) {
	r.mu.Lock()
	r.insertLocked(o)
	r.mu.Unlock()
	r.cond.Broadcast()
}

func (r *fakeOrderRepo) Requeue(o core.Order) {
	o.Status = core.StatusPending
	r.mu.Lock()
	r.insertLocked(o)
	r.mu.Unlock()
	r.cond.Broadcast()
}

func (r *fakeOrderRepo) Dequeue(stop <-chan struct{}) (core.Order, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for {
		select {
		case <-stop:
			return core.Order{}, false
		default:
		}
		if len(r.pending) > 0 {
			o := r.pending[0]
			r.pending = r.pending[1:]
			o.Status = core.StatusProcessing
			return o, true
		}
		r.cond.Wait()
	}
}

func (r *fakeOrderRepo) Complete(o core.Order) core.Order {
	o.Status = core.StatusComplete
	r.mu.Lock()
	r.completed = append(r.completed, o)
	r.mu.Unlock()
	return o
}

func (r *fakeOrderRepo) WakeAll() {
	r.cond.Broadcast()
}

func (r *fakeOrderRepo) PendingSnapshot() []core.Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]core.Order, len(r.pending))
	copy(out, r.pending)
	return out
}

// CompletedCounts implements the usecase.OrderRepository port.
func (r *fakeOrderRepo) CompletedCounts() (total, vip, normal int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, o := range r.completed {
		if o.Kind == core.KindVIP {
			vip++
		} else {
			normal++
		}
	}
	return len(r.completed), vip, normal
}

// CompletedSnapshot is a test-only helper (not part of the port) so tests
// can assert on the actual completed order values.
func (r *fakeOrderRepo) CompletedSnapshot() []core.Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]core.Order, len(r.completed))
	copy(out, r.completed)
	return out
}

func (r *fakeOrderRepo) PendingLen() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.pending)
}

// fakeBotRepo is a local, test-only fake implementing usecase.BotRepository.
type fakeBotRepo struct {
	mu     sync.Mutex
	nextID int
	bots   []*core.Bot
}

func newFakeBotRepo() *fakeBotRepo {
	return &fakeBotRepo{}
}

func (r *fakeBotRepo) NextBotID() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.nextID++
	return r.nextID
}

func (r *fakeBotRepo) Add(b *core.Bot) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.bots = append(r.bots, b)
}

func (r *fakeBotRepo) RemoveNewest() (*core.Bot, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.bots) == 0 {
		return nil, false
	}
	last := len(r.bots) - 1
	b := r.bots[last]
	r.bots = r.bots[:last]
	return b, true
}

func (r *fakeBotRepo) List() []*core.Bot {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*core.Bot, len(r.bots))
	copy(out, r.bots)
	return out
}

func (r *fakeBotRepo) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.bots)
}

// newTestUsecase constructs a Usecase wired to fresh fake repositories, and
// returns the fakes too so tests can assert against repository state
// directly.
func newTestUsecase(processingTime time.Duration) (*usecase.Usecase, *fakeOrderRepo, *fakeBotRepo) {
	orders := newFakeOrderRepo()
	bots := newFakeBotRepo()
	u := usecase.New(orders, bots, fakeClock{}, noopLogger{}, processingTime)
	return u, orders, bots
}

func TestNewOrder_InterleavedIDsAreUniqueAndIncreasing(t *testing.T) {
	u, _, _ := newTestUsecase(testProcessingTime)

	var ids []int
	ids = append(ids, u.NewNormalOrder().ID)
	ids = append(ids, u.NewVIPOrder().ID)
	ids = append(ids, u.NewNormalOrder().ID)
	ids = append(ids, u.NewVIPOrder().ID)
	ids = append(ids, u.NewVIPOrder().ID)

	seen := map[int]bool{}
	for i, id := range ids {
		if seen[id] {
			t.Fatalf("duplicate order ID %d at index %d: %v", id, i, ids)
		}
		seen[id] = true
		if i > 0 && id <= ids[i-1] {
			t.Fatalf("order IDs not strictly increasing: %v", ids)
		}
	}
}

func TestAddBot_WithPendingOrder_CompletesWithinBoundedWait(t *testing.T) {
	u, orders, _ := newTestUsecase(testProcessingTime)

	order := u.NewNormalOrder()
	u.AddBot()

	waitFor(t, time.Second, func() bool {
		for _, o := range orders.CompletedSnapshot() {
			if o.ID == order.ID {
				return true
			}
		}
		return false
	})
}

func TestOrderCreatedWhileBotIdle_BotWakesAndCompletesIt(t *testing.T) {
	u, orders, _ := newTestUsecase(testProcessingTime)

	// Bot starts with nothing to do; give its goroutine a moment to reach
	// the blocking Dequeue call before creating an order for it to wake up
	// for (no explicit poke — the bot must wake on its own).
	u.AddBot()
	time.Sleep(5 * time.Millisecond)

	order := u.NewNormalOrder()

	waitFor(t, time.Second, func() bool {
		for _, o := range orders.CompletedSnapshot() {
			if o.ID == order.ID {
				return true
			}
		}
		return false
	})
}

func TestShutdown_WithInFlightOrders_NoOrderLost(t *testing.T) {
	u, orders, _ := newTestUsecase(testProcessingTime)

	const numOrders = 6
	created := make([]core.Order, 0, numOrders)
	for i := 0; i < numOrders; i++ {
		if i%2 == 0 {
			created = append(created, u.NewNormalOrder())
		} else {
			created = append(created, u.NewVIPOrder())
		}
	}

	u.AddBot()
	u.AddBot()

	// Give bots a moment to start processing, then shut down while some
	// orders are likely still in flight.
	time.Sleep(testProcessingTime / 2)

	summary := u.Shutdown()

	total := summary.PendingOrders + summary.CompletedOrders
	if total != numOrders {
		t.Fatalf("pending (%d) + completed (%d) = %d, want %d (no order should be lost)",
			summary.PendingOrders, summary.CompletedOrders, total, numOrders)
	}

	// Cross-check directly against the repository too.
	if got := len(orders.PendingSnapshot()) + len(orders.CompletedSnapshot()); got != numOrders {
		t.Fatalf("repository pending+completed = %d, want %d", got, numOrders)
	}

	seen := map[int]bool{}
	for _, o := range orders.PendingSnapshot() {
		seen[o.ID] = true
	}
	for _, o := range orders.CompletedSnapshot() {
		seen[o.ID] = true
	}
	for _, o := range created {
		if !seen[o.ID] {
			t.Fatalf("order #%d missing from both pending and completed", o.ID)
		}
	}
}

func TestSmoke_TwoBotsFiveMixedOrders_AllComplete(t *testing.T) {
	u, orders, _ := newTestUsecase(testProcessingTime)

	u.AddBot()
	u.AddBot()

	var created []core.Order
	created = append(created, u.NewNormalOrder())
	created = append(created, u.NewVIPOrder())
	created = append(created, u.NewNormalOrder())
	created = append(created, u.NewVIPOrder())
	created = append(created, u.NewNormalOrder())

	waitFor(t, 2*time.Second, func() bool {
		return len(orders.CompletedSnapshot()) == len(created)
	})

	completed := orders.CompletedSnapshot()
	gotIDs := map[int]bool{}
	for _, o := range completed {
		gotIDs[o.ID] = true
	}
	for _, o := range created {
		if !gotIDs[o.ID] {
			t.Fatalf("order #%d never completed", o.ID)
		}
	}
}
