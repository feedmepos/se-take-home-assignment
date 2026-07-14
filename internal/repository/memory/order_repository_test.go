package memory

import (
	"sync"
	"testing"
	"time"

	"feedme-order-controller/internal/usecase/core"
)

func mustDequeue(t *testing.T, r *OrderRepository, stop <-chan struct{}) core.Order {
	t.Helper()
	type result struct {
		o  core.Order
		ok bool
	}
	ch := make(chan result, 1)
	go func() {
		o, ok := r.Dequeue(stop)
		ch <- result{o, ok}
	}()
	select {
	case res := <-ch:
		if !res.ok {
			t.Fatalf("Dequeue returned ok=false unexpectedly")
		}
		return res.o
	case <-time.After(2 * time.Second):
		t.Fatal("Dequeue timed out")
		return core.Order{}
	}
}

func TestDequeue_VIPBeforeNormal(t *testing.T) {
	r := NewOrderRepository()
	r.Enqueue(core.Order{ID: 1, Kind: core.Normal, Status: core.Pending})
	r.Enqueue(core.Order{ID: 2, Kind: core.VIP, Status: core.Pending})

	got := mustDequeue(t, r, nil)
	if got.ID != 2 || got.Kind != core.VIP {
		t.Fatalf("expected VIP order 2 first, got %+v", got)
	}
	if got.Status != core.Processing {
		t.Fatalf("expected Status=Processing, got %v", got.Status)
	}

	got2 := mustDequeue(t, r, nil)
	if got2.ID != 1 {
		t.Fatalf("expected Normal order 1 second, got %+v", got2)
	}
}

func TestDequeue_FIFOWithinKind(t *testing.T) {
	r := NewOrderRepository()
	// Multiple VIPs
	r.Enqueue(core.Order{ID: 1, Kind: core.VIP})
	r.Enqueue(core.Order{ID: 2, Kind: core.VIP})
	r.Enqueue(core.Order{ID: 3, Kind: core.VIP})
	// Multiple Normals
	r.Enqueue(core.Order{ID: 4, Kind: core.Normal})
	r.Enqueue(core.Order{ID: 5, Kind: core.Normal})

	wantOrder := []int{1, 2, 3, 4, 5}
	for _, want := range wantOrder {
		got := mustDequeue(t, r, nil)
		if got.ID != want {
			t.Fatalf("expected order ID %d, got %d", want, got.ID)
		}
	}
}

func TestRequeue_ReproducesOriginalPosition(t *testing.T) {
	r := NewOrderRepository()
	r.Enqueue(core.Order{ID: 2, Kind: core.VIP})    // V#2
	r.Enqueue(core.Order{ID: 1, Kind: core.Normal}) // N#1
	r.Enqueue(core.Order{ID: 3, Kind: core.Normal}) // N#3

	head := mustDequeue(t, r, nil) // pops V#2
	if head.ID != 2 {
		t.Fatalf("expected to dequeue V#2 first, got %+v", head)
	}

	r.Enqueue(core.Order{ID: 4, Kind: core.VIP}) // V#4
	r.Requeue(head)                              // re-insert V#2

	snap := r.PendingSnapshot()
	wantIDs := []int{2, 4, 1, 3}
	if len(snap) != len(wantIDs) {
		t.Fatalf("expected %d pending orders, got %d: %+v", len(wantIDs), len(snap), snap)
	}
	for i, want := range wantIDs {
		if snap[i].ID != want {
			t.Fatalf("position %d: expected order ID %d, got %d (full snapshot: %+v)", i, want, snap[i].ID, snap)
		}
		if snap[i].Status != core.Pending {
			t.Fatalf("expected Status=Pending in snapshot, got %v", snap[i].Status)
		}
	}
}

func TestDequeue_BlocksUntilEnqueue(t *testing.T) {
	r := NewOrderRepository()
	done := make(chan core.Order, 1)
	go func() {
		o, ok := r.Dequeue(nil)
		if !ok {
			t.Error("expected ok=true")
			return
		}
		done <- o
	}()

	// Give the goroutine time to start blocking.
	select {
	case <-done:
		t.Fatal("Dequeue returned before any order was enqueued")
	case <-time.After(100 * time.Millisecond):
	}

	r.Enqueue(core.Order{ID: 1, Kind: core.Normal})

	select {
	case o := <-done:
		if o.ID != 1 {
			t.Fatalf("expected order 1, got %+v", o)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Dequeue did not unblock after Enqueue")
	}
}

func TestDequeue_StopUnblocksEmptyQueue(t *testing.T) {
	r := NewOrderRepository()
	stop := make(chan struct{})
	done := make(chan struct {
		o  core.Order
		ok bool
	}, 1)

	go func() {
		o, ok := r.Dequeue(stop)
		done <- struct {
			o  core.Order
			ok bool
		}{o, ok}
	}()

	// Ensure the goroutine has entered Dequeue and is blocked.
	time.Sleep(50 * time.Millisecond)
	close(stop)
	// Closing stop alone does not wake a goroutine parked in cond.Wait();
	// the caller (e.g. the usecase layer stopping a bot) is responsible for
	// calling WakeAll() so the blocked Dequeue re-checks stop promptly.
	r.WakeAll()

	select {
	case res := <-done:
		if res.ok {
			t.Fatalf("expected ok=false after stop closed, got order %+v", res.o)
		}
		if res.o != (core.Order{}) {
			t.Fatalf("expected zero Order after stop closed, got %+v", res.o)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Dequeue did not unblock after stop closed")
	}
}

func TestOrderRepository_ConcurrentEnqueueDequeue(t *testing.T) {
	r := NewOrderRepository()
	stop := make(chan struct{})
	const numOrders = 200
	const numWorkers = 8

	var produced sync.WaitGroup
	for i := 0; i < numOrders; i++ {
		produced.Add(1)
		go func(i int) {
			defer produced.Done()
			kind := core.Normal
			if i%3 == 0 {
				kind = core.VIP
			}
			r.Enqueue(core.Order{ID: i + 1, Kind: kind})
		}(i)
	}

	var consumedCount int
	var consumedMu sync.Mutex
	var consumers sync.WaitGroup
	for w := 0; w < numWorkers; w++ {
		consumers.Add(1)
		go func() {
			defer consumers.Done()
			for {
				o, ok := r.Dequeue(stop)
				if !ok {
					return
				}
				_ = r.Complete(o)
				consumedMu.Lock()
				consumedCount++
				done := consumedCount >= numOrders
				consumedMu.Unlock()
				if done {
					return
				}
			}
		}()
	}

	produced.Wait()

	// Once all orders have been consumed, close stop and wake any workers
	// still blocked in Dequeue with an empty queue so they can exit.
	stopOnce := sync.Once{}
	closeStop := func() { stopOnce.Do(func() { close(stop) }) }
	go func() {
		for {
			consumedMu.Lock()
			done := consumedCount >= numOrders
			consumedMu.Unlock()
			if done {
				closeStop()
				r.WakeAll()
				return
			}
			time.Sleep(5 * time.Millisecond)
		}
	}()

	waitCh := make(chan struct{})
	go func() {
		consumers.Wait()
		close(waitCh)
	}()

	select {
	case <-waitCh:
	case <-time.After(5 * time.Second):
		closeStop()
		r.WakeAll()
		t.Fatal("consumers did not finish consuming all orders in time")
	}
	closeStop()
	r.WakeAll()

	if consumedCount != numOrders {
		t.Fatalf("expected %d consumed orders, got %d", numOrders, consumedCount)
	}
	completed := r.CompletedSnapshot()
	if len(completed) != numOrders {
		t.Fatalf("expected %d completed orders, got %d", numOrders, len(completed))
	}
	if r.PendingLen() != 0 {
		t.Fatalf("expected empty pending queue, got %d", r.PendingLen())
	}
}

func TestNextOrderID_StrictlyIncreasing(t *testing.T) {
	r := NewOrderRepository()
	prev := 0
	for i := 0; i < 10; i++ {
		id := r.NextOrderID()
		if id <= prev {
			t.Fatalf("expected strictly increasing IDs, got %d after %d", id, prev)
		}
		prev = id
	}
}
