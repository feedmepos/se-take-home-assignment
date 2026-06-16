package queue

import (
	"sync"
	"testing"
	"time"

	"github.com/se-take-home-assignment/internal/order"
)

// ============================================================
// Enqueue
// ============================================================

func TestEnqueue_PendingOrders(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	pending := q.PendingOrders()
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending, got %d", len(pending))
	}
	if pending[0].ID() != o.ID() {
		t.Errorf("expected order %d, got %d", o.ID(), pending[0].ID())
	}
}

func TestEnqueue_VIPBeforeNormal(t *testing.T) {
	q := New()
	n := order.NewNormal()
	v := order.NewVIP()

	q.Enqueue(n)
	q.Enqueue(v)

	pending := q.PendingOrders()
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending, got %d", len(pending))
	}
	if pending[0].ID() != v.ID() {
		t.Errorf("expected VIP %d first, got %d", v.ID(), pending[0].ID())
	}
	if pending[1].ID() != n.ID() {
		t.Errorf("expected Normal %d second, got %d", n.ID(), pending[1].ID())
	}
}

func TestEnqueue_WakesBlockedDequeue(t *testing.T) {
	q := New()
	stopCh := make(chan struct{})

	resultCh := make(chan *order.Order, 1)
	go func() {
		resultCh <- q.Dequeue(stopCh)
	}()

	// Verify blocked
	select {
	case <-resultCh:
		t.Fatal("Dequeue should block on empty queue")
	case <-time.After(100 * time.Millisecond):
	}

	o := order.NewNormal()
	q.Enqueue(o)

	select {
	case result := <-resultCh:
		if result == nil {
			t.Fatal("expected order, got nil")
		}
		if result.ID() != o.ID() {
			t.Errorf("expected order %d, got %d", o.ID(), result.ID())
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Dequeue did not wake after Enqueue")
	}
}

// ============================================================
// Dequeue
// ============================================================

func TestDequeue_VIPPriority(t *testing.T) {
	q := New()
	n := order.NewNormal()
	v := order.NewVIP()

	q.Enqueue(n)
	q.Enqueue(v)

	stopCh := make(chan struct{})
	first := q.Dequeue(stopCh)
	if first.ID() != v.ID() {
		t.Errorf("expected VIP %d first, got %d", v.ID(), first.ID())
	}

	second := q.Dequeue(stopCh)
	if second.ID() != n.ID() {
		t.Errorf("expected Normal %d second, got %d", n.ID(), second.ID())
	}
}

func TestDequeue_FIFOWithinSamePriority(t *testing.T) {
	q := New()
	n1 := order.NewNormal()
	n2 := order.NewNormal()
	n3 := order.NewNormal()

	q.Enqueue(n1)
	q.Enqueue(n2)
	q.Enqueue(n3)

	stopCh := make(chan struct{})
	first := q.Dequeue(stopCh)
	second := q.Dequeue(stopCh)
	third := q.Dequeue(stopCh)

	if first.ID() != n1.ID() || second.ID() != n2.ID() || third.ID() != n3.ID() {
		t.Errorf("expected FIFO order [%d,%d,%d], got [%d,%d,%d]",
			n1.ID(), n2.ID(), n3.ID(),
			first.ID(), second.ID(), third.ID())
	}
}

func TestDequeue_VIPFIFOWithinSamePriority(t *testing.T) {
	q := New()
	v1 := order.NewVIP()
	v2 := order.NewVIP()

	q.Enqueue(v1)
	q.Enqueue(v2)

	stopCh := make(chan struct{})
	first := q.Dequeue(stopCh)
	second := q.Dequeue(stopCh)

	if first.ID() != v1.ID() {
		t.Errorf("expected VIP %d first, got %d", v1.ID(), first.ID())
	}
	if second.ID() != v2.ID() {
		t.Errorf("expected VIP %d second, got %d", v2.ID(), second.ID())
	}
}

func TestDequeue_StopChReturnsNil(t *testing.T) {
	q := New()
	stopCh := make(chan struct{})

	resultCh := make(chan *order.Order, 1)
	go func() {
		resultCh <- q.Dequeue(stopCh)
	}()

	select {
	case <-resultCh:
		t.Fatal("should block")
	case <-time.After(100 * time.Millisecond):
	}

	close(stopCh)

	select {
	case result := <-resultCh:
		if result != nil {
			t.Errorf("expected nil after stopCh closed, got %v", result)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Dequeue did not return after stopCh closed")
	}
}

func TestDequeue_StopChAlreadyClosed(t *testing.T) {
	q := New()
	stopCh := make(chan struct{})
	close(stopCh)

	result := q.Dequeue(stopCh)
	if result != nil {
		t.Errorf("expected nil with pre-closed stopCh, got %v", result)
	}
}

func TestDequeue_MovesToProcessing(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh)

	pending := q.PendingOrders()
	processing := q.ProcessingOrders()

	if len(pending) != 0 {
		t.Errorf("expected 0 pending, got %d", len(pending))
	}
	if len(processing) != 1 {
		t.Fatalf("expected 1 processing, got %d", len(processing))
	}
	if processing[0].ID() != o.ID() {
		t.Errorf("expected order %d in processing, got %d", o.ID(), processing[0].ID())
	}
}

func TestDequeue_OnlyOneGoroutineWakesPerEnqueue(t *testing.T) {
	q := New()
	stopCh := make(chan struct{})

	results := make(chan int, 3)
	launch := func() {
		o := q.Dequeue(stopCh)
		if o != nil {
			results <- o.ID()
		}
	}

	// Start 3 goroutines, all blocked
	go launch()
	go launch()
	go launch()

	time.Sleep(100 * time.Millisecond)

	// Enqueue one order — only one goroutine should wake
	o1 := order.NewNormal()
	q.Enqueue(o1)
	time.Sleep(100 * time.Millisecond)
	if got := len(results); got != 1 {
		t.Errorf("expected 1 goroutine woken, got %d", got)
	}

	// Enqueue another — second goroutine wakes
	o2 := order.NewNormal()
	q.Enqueue(o2)
	time.Sleep(100 * time.Millisecond)
	if got := len(results); got != 2 {
		t.Errorf("expected 2 goroutines woken, got %d", got)
	}
}

// ============================================================
// RecycleOrder
// ============================================================

func TestRecycleOrder_ReturnsToPending(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh) // now in processing

	q.RecycleOrder(o)

	pending := q.PendingOrders()
	processing := q.ProcessingOrders()

	if len(processing) != 0 {
		t.Errorf("expected 0 processing, got %d", len(processing))
	}
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending, got %d", len(pending))
	}
	if pending[0].ID() != o.ID() {
		t.Errorf("expected order %d in pending, got %d", o.ID(), pending[0].ID())
	}
}

func TestRecycleOrder_PreservesPriority(t *testing.T) {
	q := New()
	vip := order.NewVIP()
	norm1 := order.NewNormal()
	norm2 := order.NewNormal()

	q.Enqueue(vip)
	q.Enqueue(norm1)
	q.Enqueue(norm2)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh) // VIP dequeued into processing

	q.RecycleOrder(vip) // VIP returned to pending

	pending := q.PendingOrders()
	if len(pending) != 3 {
		t.Fatalf("expected 3 pending, got %d", len(pending))
	}
	// Recycled VIP should be at front of its priority group
	if pending[0].ID() != vip.ID() {
		t.Errorf("expected recycled VIP %d at front, got %d", vip.ID(), pending[0].ID())
	}
	// Normals maintain FIFO order
	if pending[1].ID() != norm1.ID() || pending[2].ID() != norm2.ID() {
		t.Error("Normal orders should maintain FIFO after VIP recycle")
	}
}

func TestRecycleOrder_WakesBlockedDequeue(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh) // now in processing

	// Start a goroutine waiting for an order
	resultCh := make(chan *order.Order, 1)
	go func() {
		resultCh <- q.Dequeue(stopCh)
	}()

	// Verify blocked
	select {
	case <-resultCh:
		t.Fatal("Dequeue should block")
	case <-time.After(100 * time.Millisecond):
	}

	// Recycle wakes the blocked goroutine
	q.RecycleOrder(o)

	select {
	case result := <-resultCh:
		if result == nil || result.ID() != o.ID() {
			t.Errorf("expected order %d, got %v", o.ID(), result)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Dequeue did not wake after RecycleOrder")
	}
}

// ============================================================
// CompleteOrder
// ============================================================

func TestCompleteOrder_MovesToCompleted(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh) // now in processing

	q.CompleteOrder(o)

	processing := q.ProcessingOrders()
	completed := q.CompletedOrders()

	if len(processing) != 0 {
		t.Errorf("expected 0 processing, got %d", len(processing))
	}
	if len(completed) != 1 {
		t.Fatalf("expected 1 completed, got %d", len(completed))
	}
	if completed[0].ID() != o.ID() {
		t.Errorf("expected order %d in completed, got %d", o.ID(), completed[0].ID())
	}
}

func TestCompleteOrder_MultipleOrders(t *testing.T) {
	q := New()
	o1 := order.NewNormal()
	o2 := order.NewVIP()
	o3 := order.NewNormal()

	q.Enqueue(o1)
	q.Enqueue(o2)
	q.Enqueue(o3)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh) // VIP o2
	q.Dequeue(stopCh) // Normal o1

	q.CompleteOrder(o2)
	q.CompleteOrder(o1)

	processing := q.ProcessingOrders()
	completed := q.CompletedOrders()

	if len(processing) != 0 {
		t.Errorf("expected 0 processing, got %d", len(processing))
	}

	ids := make(map[int]bool)
	for _, o := range completed {
		ids[o.ID()] = true
	}
	if !ids[o1.ID()] || !ids[o2.ID()] {
		t.Errorf("expected completed to contain both orders")
	}
}

// ============================================================
// PendingOrders
// ============================================================

func TestPendingOrders_Empty(t *testing.T) {
	q := New()
	result := q.PendingOrders()
	if len(result) != 0 {
		t.Errorf("expected empty pending, got %d items", len(result))
	}
}

func TestPendingOrders_SortedOutput(t *testing.T) {
	q := New()
	n1 := order.NewNormal()
	v1 := order.NewVIP()
	n2 := order.NewNormal()
	v2 := order.NewVIP()

	// Enqueue in mixed order
	q.Enqueue(n1)
	q.Enqueue(v1)
	q.Enqueue(n2)
	q.Enqueue(v2)

	result := q.PendingOrders()
	if len(result) != 4 {
		t.Fatalf("expected 4 pending, got %d", len(result))
	}

	// VIPs first (by ID), then Normals (by ID)
	expected := []*order.Order{v1, v2, n1, n2}
	for i, exp := range expected {
		if result[i].ID() != exp.ID() {
			t.Errorf("position %d: expected %d, got %d", i, exp.ID(), result[i].ID())
		}
	}
}

func TestPendingOrders_ReturnsCopy(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	result1 := q.PendingOrders()
	result2 := q.PendingOrders()

	// Mutate result1 — should not affect result2 or the queue
	result1[0] = nil

	result3 := q.PendingOrders()
	if result3[0] == nil || result3[0].ID() != o.ID() {
		t.Error("PendingOrders should return a copy, not the internal slice")
	}
	_ = result2
	_ = result3
}

// ============================================================
// ProcessingOrders
// ============================================================

func TestProcessingOrders_Empty(t *testing.T) {
	q := New()
	result := q.ProcessingOrders()
	if len(result) != 0 {
		t.Errorf("expected empty processing, got %d items", len(result))
	}
}

func TestProcessingOrders_AfterDequeue(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh)

	result := q.ProcessingOrders()
	if len(result) != 1 {
		t.Fatalf("expected 1 processing, got %d", len(result))
	}
	if result[0].ID() != o.ID() {
		t.Errorf("expected order %d, got %d", o.ID(), result[0].ID())
	}
}

func TestProcessingOrders_ReturnsCopy(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh)

	result1 := q.ProcessingOrders()
	result1[0] = nil

	result2 := q.ProcessingOrders()
	if result2[0] == nil || result2[0].ID() != o.ID() {
		t.Error("ProcessingOrders should return a copy")
	}
}

// ============================================================
// CompletedOrders
// ============================================================

func TestCompletedOrders_Empty(t *testing.T) {
	q := New()
	result := q.CompletedOrders()
	if len(result) != 0 {
		t.Errorf("expected empty completed, got %d items", len(result))
	}
}

func TestCompletedOrders_AfterComplete(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh)
	q.CompleteOrder(o)

	result := q.CompletedOrders()
	if len(result) != 1 {
		t.Fatalf("expected 1 completed, got %d", len(result))
	}
	if result[0].ID() != o.ID() {
		t.Errorf("expected order %d, got %d", o.ID(), result[0].ID())
	}
}

func TestCompletedOrders_Multiple(t *testing.T) {
	q := New()
	o1 := order.NewNormal()
	o2 := order.NewNormal()
	o3 := order.NewNormal()

	stopCh := make(chan struct{})
	for _, o := range []*order.Order{o1, o2, o3} {
		q.Enqueue(o)
		q.Dequeue(stopCh)
		q.CompleteOrder(o)
	}

	result := q.CompletedOrders()
	if len(result) != 3 {
		t.Fatalf("expected 3 completed, got %d", len(result))
	}

	ids := make(map[int]bool)
	for _, o := range result {
		ids[o.ID()] = true
	}
	if !ids[o1.ID()] || !ids[o2.ID()] || !ids[o3.ID()] {
		t.Error("expected all orders in completed")
	}
}

func TestCompletedOrders_ReturnsCopy(t *testing.T) {
	q := New()
	o := order.NewNormal()
	q.Enqueue(o)

	stopCh := make(chan struct{})
	q.Dequeue(stopCh)
	q.CompleteOrder(o)

	result1 := q.CompletedOrders()
	result1[0] = nil

	result2 := q.CompletedOrders()
	if result2[0] == nil || result2[0].ID() != o.ID() {
		t.Error("CompletedOrders should return a copy")
	}
}

// ============================================================
// Full lifecycle
// ============================================================

func TestFullLifecycle(t *testing.T) {
	q := New()
	stopCh := make(chan struct{})

	// Enqueue mixed orders
	vip := order.NewVIP()
	norm1 := order.NewNormal()
	norm2 := order.NewNormal()

	q.Enqueue(norm1)
	q.Enqueue(vip)
	q.Enqueue(norm2)

	// Dequeue VIP (priority)
	first := q.Dequeue(stopCh)
	if first.ID() != vip.ID() {
		t.Fatalf("expected VIP %d, got %d", vip.ID(), first.ID())
	}

	// Recycle VIP back to pending
	q.RecycleOrder(vip)

	// Dequeue again — VIP should come back first
	second := q.Dequeue(stopCh)
	if second.ID() != vip.ID() {
		t.Errorf("expected recycled VIP %d, got %d", vip.ID(), second.ID())
	}

	// Complete VIP
	q.CompleteOrder(vip)

	// Dequeue rest
	q.Dequeue(stopCh) // norm1
	q.Dequeue(stopCh) // norm2
	q.CompleteOrder(norm1)
	q.CompleteOrder(norm2)

	// Verify final state
	if len(q.PendingOrders()) != 0 {
		t.Error("pending should be empty")
	}
	if len(q.ProcessingOrders()) != 0 {
		t.Error("processing should be empty")
	}
	if len(q.CompletedOrders()) != 3 {
		t.Errorf("expected 3 completed, got %d", len(q.CompletedOrders()))
	}
}

// ============================================================
// Concurrency
// ============================================================

func TestConcurrentEnqueueDequeue(t *testing.T) {
	q := New()
	stopCh := make(chan struct{})

	var wg sync.WaitGroup
	const numOrders = 50

	// Producer
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < numOrders; i++ {
			if i%2 == 0 {
				q.Enqueue(order.NewVIP())
			} else {
				q.Enqueue(order.NewNormal())
			}
		}
	}()

	// Consumer
	received := make([]*order.Order, 0, numOrders)
	var mu sync.Mutex

	go func() {
		for {
			o := q.Dequeue(stopCh)
			if o == nil {
				return
			}
			mu.Lock()
			received = append(received, o)
			mu.Unlock()
			q.CompleteOrder(o)
		}
	}()

	wg.Wait()

	// Wait for all orders to be processed
	for len(q.PendingOrders())+len(q.ProcessingOrders()) > 0 {
		time.Sleep(50 * time.Millisecond)
	}
	close(stopCh)

	// Wait for consumer to finish
	for i := 0; i < 100; i++ {
		if len(q.CompletedOrders()) == numOrders {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}

	mu.Lock()
	defer mu.Unlock()
	if len(received) != numOrders {
		t.Errorf("expected %d orders, got %d", numOrders, len(received))
	}

	// Verify ID uniqueness
	ids := make(map[int]bool)
	for _, o := range received {
		if ids[o.ID()] {
			t.Errorf("duplicate order ID %d", o.ID())
		}
		ids[o.ID()] = true
	}
}
