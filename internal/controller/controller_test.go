package controller

import (
	"fmt"
	"math/rand"
	"sync"
	"testing"
	"time"
)

type fakeTimer struct {
	mu     sync.Mutex
	timers []chan time.Time
}

func (f *fakeTimer) After(time.Duration) <-chan time.Time {
	ch := make(chan time.Time, 1)
	f.mu.Lock()
	f.timers = append(f.timers, ch)
	f.mu.Unlock()
	return ch
}

func (f *fakeTimer) FireNext() bool {
	f.mu.Lock()
	if len(f.timers) == 0 {
		f.mu.Unlock()
		return false
	}
	ch := f.timers[0]
	copy(f.timers, f.timers[1:])
	f.timers[len(f.timers)-1] = nil
	f.timers = f.timers[:len(f.timers)-1]
	f.mu.Unlock()
	ch <- time.Now()
	return true
}

func (f *fakeTimer) FireAll() {
	for f.FireNext() {
	}
}

func newTestController() (*Controller, *fakeTimer) {
	timer := &fakeTimer{}
	return New(Options{Timer: timer, ProcessDuration: 10 * time.Second}), timer
}

func TestOrderIDsUniqueAndIncreasing(t *testing.T) {
	c, _ := newTestController()

	a := c.AddOrder(Normal)
	b := c.AddOrder(VIP)
	d := c.AddOrder(Normal)

	if a.ID != 1 || b.ID != 2 || d.ID != 3 {
		t.Fatalf("ids = [%d %d %d], want [1 2 3]", a.ID, b.ID, d.ID)
	}
	assertConservation(t, c.Snapshot())
}

func TestVIPBeforeNormalFIFOWithinKind(t *testing.T) {
	c, _ := newTestController()

	c.AddOrder(Normal) // #1
	c.AddOrder(Normal) // #2
	c.AddOrder(VIP)    // #3
	c.AddOrder(VIP)    // #4
	c.AddOrder(Normal) // #5

	if got, want := orderIDs(c.Snapshot().Pending), []int{3, 4, 1, 2, 5}; !equalInts(got, want) {
		t.Fatalf("pending = %v, want %v", got, want)
	}
	assertConservation(t, c.Snapshot())
}

func TestOrdersStayPendingWhenThereAreZeroBots(t *testing.T) {
	c, _ := newTestController()

	c.AddOrder(Normal)
	c.AddOrder(VIP)

	snap := c.Snapshot()
	if got, want := orderIDs(snap.Pending), []int{2, 1}; !equalInts(got, want) {
		t.Fatalf("pending = %v, want %v", got, want)
	}
	if len(snap.Processing) != 0 || len(snap.Completed) != 0 {
		t.Fatalf("unexpected non-pending orders: %+v", snap)
	}
	assertConservation(t, snap)
}

func TestAddingBotImmediatelyPicksUpPendingWork(t *testing.T) {
	c, _ := newTestController()

	c.AddOrder(VIP)
	c.AddBot()

	snap := c.Snapshot()
	if len(snap.Pending) != 0 {
		t.Fatalf("pending = %v, want empty", snap.Pending)
	}
	if got, want := processingIDs(snap), []int{1}; !equalInts(got, want) {
		t.Fatalf("processing = %v, want %v", got, want)
	}
	assertConservation(t, snap)
}

func TestIdleBotPicksUpNewlyArrivingOrder(t *testing.T) {
	c, _ := newTestController()

	c.AddBot()
	c.AddOrder(Normal)

	snap := c.Snapshot()
	if got, want := processingIDs(snap), []int{1}; !equalInts(got, want) {
		t.Fatalf("processing = %v, want %v", got, want)
	}
	if snap.Bots[0].Status != BotProcessing {
		t.Fatalf("bot status = %s, want %s", snap.Bots[0].Status, BotProcessing)
	}
	assertConservation(t, snap)
}

func TestBotCompletesThenPicksNextOrder(t *testing.T) {
	c, timer := newTestController()

	c.AddOrder(VIP)    // #1
	c.AddOrder(Normal) // #2
	c.AddBot()

	timer.FireNext()
	mustEventually(t, func() bool {
		snap := c.Snapshot()
		return len(snap.Completed) == 1 && len(snap.Processing) == 1 && snap.Processing[0].Order.ID == 2
	})

	timer.FireNext()
	mustEventually(t, func() bool {
		return len(c.Snapshot().Completed) == 2
	})
	assertConservation(t, c.Snapshot())
}

func TestRemoveBotTargetsNewestBotLIFO(t *testing.T) {
	c, _ := newTestController()

	c.AddOrder(Normal) // #1
	c.AddOrder(Normal) // #2
	c.AddBot()         // Bot #1 picks #1
	c.AddBot()         // Bot #2 picks #2

	c.RemoveBot()

	snap := c.Snapshot()
	if got, want := botIDs(snap.Bots), []int{1}; !equalInts(got, want) {
		t.Fatalf("bots = %v, want %v", got, want)
	}
	if got, want := orderIDs(snap.Pending), []int{2}; !equalInts(got, want) {
		t.Fatalf("pending = %v, want returned newest bot order %v", got, want)
	}
	assertConservation(t, snap)
}

func TestRemovingIdleBotDoesNotAffectOrders(t *testing.T) {
	c, _ := newTestController()

	c.AddBot()         // Bot #1 idle
	c.AddOrder(Normal) // Bot #1 picks #1
	c.AddBot()         // Bot #2 idle and newest

	c.RemoveBot()

	snap := c.Snapshot()
	if got, want := botIDs(snap.Bots), []int{1}; !equalInts(got, want) {
		t.Fatalf("bots = %v, want %v", got, want)
	}
	if got, want := processingIDs(snap), []int{1}; !equalInts(got, want) {
		t.Fatalf("processing = %v, want %v", got, want)
	}
	if len(snap.Pending) != 0 {
		t.Fatalf("pending = %v, want empty", snap.Pending)
	}
	assertConservation(t, snap)
}

func TestRemovingProcessingBotRequeuesAtExactPriorityPosition(t *testing.T) {
	c, _ := newTestController()

	c.AddOrder(Normal) // #1, picked by bot
	c.AddBot()
	c.AddOrder(Normal) // #2
	c.AddOrder(VIP)    // #3

	c.RemoveBot()

	snap := c.Snapshot()
	if got, want := orderIDs(snap.Pending), []int{3, 1, 2}; !equalInts(got, want) {
		t.Fatalf("pending = %v, want %v", got, want)
	}
	assertConservation(t, snap)
}

func TestRequeuedVIPPreservesFIFOAmongVIPs(t *testing.T) {
	c, _ := newTestController()

	c.AddOrder(VIP) // #1, picked by bot
	c.AddBot()
	c.AddOrder(VIP) // #2, pending behind #1
	c.AddOrder(VIP) // #3, pending behind #2

	c.RemoveBot()

	snap := c.Snapshot()
	if got, want := orderIDs(snap.Pending), []int{1, 2, 3}; !equalInts(got, want) {
		t.Fatalf("pending = %v, want %v", got, want)
	}
	assertConservation(t, snap)
}

func TestRequeuedOrderIsImmediatelyPickedUpByRemainingIdleBot(t *testing.T) {
	c, _ := newTestController()

	c.AddBot()         // Bot #1 idle
	c.AddBot()         // Bot #2 idle
	c.AddOrder(Normal) // Bot #1 picks #1

	c.mu.Lock()
	c.bots[0], c.bots[1] = c.bots[1], c.bots[0] // make busy bot newest; older bot remains idle
	c.mu.Unlock()

	c.RemoveBot()

	snap := c.Snapshot()
	if got, want := botIDs(snap.Bots), []int{2}; !equalInts(got, want) {
		t.Fatalf("bots = %v, want remaining idle bot %v", got, want)
	}
	if got, want := processingIDs(snap), []int{1}; !equalInts(got, want) {
		t.Fatalf("processing = %v, want requeued order immediately reassigned %v", got, want)
	}
	if len(snap.Pending) != 0 {
		t.Fatalf("pending = %v, want empty after immediate reassignment", snap.Pending)
	}
	assertConservation(t, snap)
}

func TestMultiBotRemovalRestoresReturnedOrdersInOriginalOrder(t *testing.T) {
	c, _ := newTestController()

	c.AddOrder(Normal) // #1 -> Bot #1
	c.AddOrder(Normal) // #2 -> Bot #2
	c.AddOrder(Normal) // #3 stays pending
	c.AddBot()
	c.AddBot()
	c.AddOrder(VIP) // #4 jumps ahead of pending normals

	c.RemoveBot() // returns #2
	c.RemoveBot() // returns #1

	snap := c.Snapshot()
	if got, want := orderIDs(snap.Pending), []int{4, 1, 2, 3}; !equalInts(got, want) {
		t.Fatalf("pending = %v, want %v", got, want)
	}
	assertConservation(t, snap)
}

func TestStaleCompletionAfterRemovalCannotDuplicateOrLoseOrder(t *testing.T) {
	c, timer := newTestController()

	c.AddOrder(Normal)
	c.AddBot()

	c.mu.Lock()
	b := c.bots[0]
	order := b.current
	c.mu.Unlock()

	c.RemoveBot()
	if events := c.finishOrder(b, order); len(events) != 0 {
		t.Fatalf("stale completion emitted events: %+v", events)
	}
	timer.FireAll()

	mustEventually(t, func() bool {
		snap := c.Snapshot()
		return len(snap.Pending) == 1 && len(snap.Completed) == 0 && len(snap.Processing) == 0
	})
	assertConservation(t, c.Snapshot())
}

func TestRandomizedOperationsPreserveOrderConservation(t *testing.T) {
	c := New(Options{ProcessDuration: time.Millisecond})

	var wg sync.WaitGroup
	errs := make(chan error, 4)
	for worker := 0; worker < 4; worker++ {
		wg.Add(1)
		go func(seed int64) {
			defer wg.Done()
			rng := rand.New(rand.NewSource(seed))
			for i := 0; i < 80; i++ {
				switch rng.Intn(5) {
				case 0:
					c.AddOrder(VIP)
				case 1, 2:
					c.AddOrder(Normal)
				case 3:
					c.AddBot()
				case 4:
					c.RemoveBot()
				}
				if err := conservationError(c.Snapshot()); err != nil {
					errs <- err
					return
				}
			}
		}(int64(worker + 1))
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	time.Sleep(20 * time.Millisecond)
	assertConservation(t, c.Snapshot())
	c.StopAll()
	assertConservation(t, c.Snapshot())
}

func assertConservation(t *testing.T, snap Snapshot) {
	t.Helper()
	if err := conservationError(snap); err != nil {
		t.Fatal(err)
	}
}

func conservationError(snap Snapshot) error {
	seen := map[int]string{}
	add := func(order OrderView, where string) error {
		if prior, ok := seen[order.ID]; ok {
			return fmt.Errorf("order #%d appears in both %s and %s; snapshot=%+v", order.ID, prior, where, snap)
		}
		seen[order.ID] = where
		return nil
	}
	for _, order := range snap.Pending {
		if order.Status != Pending {
			return fmt.Errorf("pending order has status %s: %+v", order.Status, order)
		}
		if err := add(order, "pending"); err != nil {
			return err
		}
	}
	for _, item := range snap.Processing {
		if item.Order.Status != Processing {
			return fmt.Errorf("processing order has status %s: %+v", item.Order.Status, item)
		}
		if err := add(item.Order, "processing"); err != nil {
			return err
		}
	}
	for _, order := range snap.Completed {
		if order.Status != Complete {
			return fmt.Errorf("completed order has status %s: %+v", order.Status, order)
		}
		if err := add(order, "completed"); err != nil {
			return err
		}
	}
	if len(seen) != len(snap.AllOrders) {
		return fmt.Errorf("visible orders = %d, all orders = %d; snapshot=%+v", len(seen), len(snap.AllOrders), snap)
	}
	for _, order := range snap.AllOrders {
		if _, ok := seen[order.ID]; !ok {
			return fmt.Errorf("order #%d is lost; snapshot=%+v", order.ID, snap)
		}
	}
	return nil
}

func mustEventually(t *testing.T, predicate func() bool) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if predicate() {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("condition was not met before deadline")
}

func orderIDs(orders []OrderView) []int {
	ids := make([]int, 0, len(orders))
	for _, order := range orders {
		ids = append(ids, order.ID)
	}
	return ids
}

func processingIDs(snap Snapshot) []int {
	ids := make([]int, 0, len(snap.Processing))
	for _, item := range snap.Processing {
		ids = append(ids, item.Order.ID)
	}
	return ids
}

func botIDs(bots []BotView) []int {
	ids := make([]int, 0, len(bots))
	for _, bot := range bots {
		ids = append(ids, bot.ID)
	}
	return ids
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
