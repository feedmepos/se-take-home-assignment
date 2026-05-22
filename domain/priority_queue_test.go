package domain

import (
	"sync"
	"testing"
	"time"
)

func TestPriorityQueue_EnqueueDequeue(t *testing.T) {
	pq := NewPriorityQueue()

	order1 := &Order{ID: 1, Type: Normal, CreatedAt: time.Now()}
	order2 := &Order{ID: 2, Type: Normal, CreatedAt: time.Now()}

	pq.Enqueue(order1)
	pq.Enqueue(order2)

	if pq.Size() != 2 {
		t.Errorf("expected size 2, got %d", pq.Size())
	}

	result1 := pq.Dequeue()
	if result1.ID != 1 {
		t.Errorf("expected order ID 1, got %d", result1.ID)
	}

	result2 := pq.Dequeue()
	if result2.ID != 2 {
		t.Errorf("expected order ID 2, got %d", result2.ID)
	}

	if pq.Size() != 0 {
		t.Errorf("expected size 0, got %d", pq.Size())
	}

	result3 := pq.Dequeue()
	if result3 != nil {
		t.Error("expected nil for empty queue")
	}
}

func TestPriorityQueue_VIPPriority(t *testing.T) {
	pq := NewPriorityQueue()

	normal1 := &Order{ID: 1, Type: Normal, CreatedAt: time.Now()}
	vip1 := &Order{ID: 2, Type: VIP, CreatedAt: time.Now()}
	normal2 := &Order{ID: 3, Type: Normal, CreatedAt: time.Now()}
	vip2 := &Order{ID: 4, Type: VIP, CreatedAt: time.Now()}

	pq.Enqueue(normal1)
	pq.Enqueue(vip1)
	pq.Enqueue(normal2)
	pq.Enqueue(vip2)

	result1 := pq.Dequeue()
	if !result1.IsVIP() {
		t.Errorf("expected VIP order first, got %s", result1.Type.String())
	}
	if result1.ID != 2 {
		t.Errorf("expected VIP order ID 2 first, got %d", result1.ID)
	}

	result2 := pq.Dequeue()
	if !result2.IsVIP() {
		t.Errorf("expected VIP order second, got %s", result2.Type.String())
	}
	if result2.ID != 4 {
		t.Errorf("expected VIP order ID 4 second, got %d", result2.ID)
	}

	result3 := pq.Dequeue()
	if result3.IsVIP() {
		t.Errorf("expected Normal order third, got %s", result3.Type.String())
	}
	if result3.ID != 1 {
		t.Errorf("expected Normal order ID 1 third, got %d", result3.ID)
	}

	result4 := pq.Dequeue()
	if result4.IsVIP() {
		t.Errorf("expected Normal order fourth, got %s", result4.Type.String())
	}
	if result4.ID != 3 {
		t.Errorf("expected Normal order ID 3 fourth, got %d", result4.ID)
	}
}

func TestPriorityQueue_FIFO(t *testing.T) {
	pq := NewPriorityQueue()

	vip1 := &Order{ID: 1, Type: VIP, CreatedAt: time.Now()}
	time.Sleep(time.Millisecond)
	vip2 := &Order{ID: 2, Type: VIP, CreatedAt: time.Now()}
	time.Sleep(time.Millisecond)
	vip3 := &Order{ID: 3, Type: VIP, CreatedAt: time.Now()}

	pq.Enqueue(vip1)
	pq.Enqueue(vip2)
	pq.Enqueue(vip3)

	result1 := pq.Dequeue()
	if result1.ID != 1 {
		t.Errorf("expected VIP order ID 1 first, got %d", result1.ID)
	}

	result2 := pq.Dequeue()
	if result2.ID != 2 {
		t.Errorf("expected VIP order ID 2 second, got %d", result2.ID)
	}

	result3 := pq.Dequeue()
	if result3.ID != 3 {
		t.Errorf("expected VIP order ID 3 third, got %d", result3.ID)
	}

	pq2 := NewPriorityQueue()

	normal1 := &Order{ID: 10, Type: Normal, CreatedAt: time.Now()}
	time.Sleep(time.Millisecond)
	normal2 := &Order{ID: 20, Type: Normal, CreatedAt: time.Now()}
	time.Sleep(time.Millisecond)
	normal3 := &Order{ID: 30, Type: Normal, CreatedAt: time.Now()}

	pq2.Enqueue(normal1)
	pq2.Enqueue(normal2)
	pq2.Enqueue(normal3)

	r1 := pq2.Dequeue()
	if r1.ID != 10 {
		t.Errorf("expected Normal order ID 10 first, got %d", r1.ID)
	}

	r2 := pq2.Dequeue()
	if r2.ID != 20 {
		t.Errorf("expected Normal order ID 20 second, got %d", r2.ID)
	}

	r3 := pq2.Dequeue()
	if r3.ID != 30 {
		t.Errorf("expected Normal order ID 30 third, got %d", r3.ID)
	}
}

func TestPriorityQueue_ReturnOrder(t *testing.T) {
	pq := NewPriorityQueue()

	normal1 := &Order{ID: 1, Type: Normal, CreatedAt: time.Now()}
	normal2 := &Order{ID: 2, Type: Normal, CreatedAt: time.Now()}
	normal3 := &Order{ID: 3, Type: Normal, CreatedAt: time.Now()}

	pq.Enqueue(normal1)
	pq.Enqueue(normal2)
	pq.Enqueue(normal3)

	dequeued := pq.Dequeue()
	if dequeued.ID != 1 {
		t.Errorf("expected order ID 1, got %d", dequeued.ID)
	}

	pq.ReturnOrder(dequeued, 0)

	pending := pq.GetPendingOrders()
	if len(pending) != 3 {
		t.Errorf("expected 3 pending orders, got %d", len(pending))
	}

	if pending[0].ID != 1 {
		t.Errorf("expected returned order at position 0, got ID %d", pending[0].ID)
	}

	pq2 := NewPriorityQueue()
	vip1 := &Order{ID: 100, Type: VIP, CreatedAt: time.Now()}
	normal4 := &Order{ID: 200, Type: Normal, CreatedAt: time.Now()}
	vip2 := &Order{ID: 300, Type: VIP, CreatedAt: time.Now()}

	pq2.Enqueue(vip1)
	pq2.Enqueue(normal4)
	pq2.Enqueue(vip2)

	dequeued2 := pq2.Dequeue()
	if dequeued2.ID != 100 {
		t.Errorf("expected VIP order ID 100, got %d", dequeued2.ID)
	}

	pq2.ReturnOrder(dequeued2, 1)

	pending2 := pq2.GetPendingOrders()
	if len(pending2) != 3 {
		t.Errorf("expected 3 pending orders, got %d", len(pending2))
	}

	if pending2[0].ID != 300 {
		t.Errorf("expected VIP order ID 300 at position 0, got ID %d", pending2[0].ID)
	}
	if pending2[1].ID != 100 {
		t.Errorf("expected returned VIP order ID 100 at position 1, got ID %d", pending2[1].ID)
	}
	if pending2[2].ID != 200 {
		t.Errorf("expected Normal order ID 200 at position 2, got ID %d", pending2[2].ID)
	}
}

func TestPriorityQueue_Concurrent(t *testing.T) {
	pq := NewPriorityQueue()
	var wg sync.WaitGroup
	numGoroutines := 100
	ordersPerGoroutine := 10

	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < ordersPerGoroutine; j++ {
				orderType := Normal
				if (id+j)%2 == 0 {
					orderType = VIP
				}
				order := &Order{
					ID:        uint64(id*ordersPerGoroutine + j),
					Type:      orderType,
					CreatedAt: time.Now(),
				}
				pq.Enqueue(order)
			}
		}(i)
	}
	wg.Wait()

	expectedSize := numGoroutines * ordersPerGoroutine
	if pq.Size() != expectedSize {
		t.Errorf("expected size %d, got %d", expectedSize, pq.Size())
	}

	var dequeueWg sync.WaitGroup
	dequeueWg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func() {
			defer dequeueWg.Done()
			for j := 0; j < ordersPerGoroutine; j++ {
				pq.Dequeue()
			}
		}()
	}
	dequeueWg.Wait()

	if pq.Size() != 0 {
		t.Errorf("expected size 0 after dequeue, got %d", pq.Size())
	}

	pq2 := NewPriorityQueue()
	var enqueueWg sync.WaitGroup
	enqueueWg.Add(2)

	go func() {
		defer enqueueWg.Done()
		for i := 0; i < 100; i++ {
			order := &Order{
				ID:        uint64(i),
				Type:      VIP,
				CreatedAt: time.Now(),
			}
			pq2.Enqueue(order)
		}
	}()

	go func() {
		defer enqueueWg.Done()
		for i := 100; i < 200; i++ {
			order := &Order{
				ID:        uint64(i),
				Type:      Normal,
				CreatedAt: time.Now(),
			}
			pq2.Enqueue(order)
		}
	}()

	enqueueWg.Wait()

	if pq2.Size() != 200 {
		t.Errorf("expected size 200 after concurrent enqueue, got %d", pq2.Size())
	}

	var dequeueWg2 sync.WaitGroup
	dequeueWg2.Add(2)
	go func() {
		defer dequeueWg2.Done()
		for i := 0; i < 50; i++ {
			pq2.Dequeue()
		}
	}()
	go func() {
		defer dequeueWg2.Done()
		for i := 0; i < 50; i++ {
			pq2.Dequeue()
		}
	}()
	dequeueWg2.Wait()

	if pq2.Size() != 100 {
		t.Errorf("expected size 100 after concurrent dequeue, got %d", pq2.Size())
	}
}

func TestPriorityQueue_MixedOrders(t *testing.T) {
	pq := NewPriorityQueue()

	orders := []*Order{
		{ID: 1, Type: Normal, CreatedAt: time.Now()},
		{ID: 2, Type: VIP, CreatedAt: time.Now()},
		{ID: 3, Type: Normal, CreatedAt: time.Now()},
		{ID: 4, Type: VIP, CreatedAt: time.Now()},
		{ID: 5, Type: Normal, CreatedAt: time.Now()},
		{ID: 6, Type: VIP, CreatedAt: time.Now()},
	}

	for _, order := range orders {
		pq.Enqueue(order)
	}

	if pq.Size() != 6 {
		t.Errorf("expected size 6, got %d", pq.Size())
	}

	expectedOrder := []uint64{2, 4, 6, 1, 3, 5}
	for i, expectedID := range expectedOrder {
		order := pq.Dequeue()
		if order.ID != expectedID {
			t.Errorf("position %d: expected order ID %d, got %d", i, expectedID, order.ID)
		}
	}

	pq2 := NewPriorityQueue()
	vip1 := &Order{ID: 10, Type: VIP, CreatedAt: time.Now()}
	vip2 := &Order{ID: 20, Type: VIP, CreatedAt: time.Now()}
	normal1 := &Order{ID: 30, Type: Normal, CreatedAt: time.Now()}
	normal2 := &Order{ID: 40, Type: Normal, CreatedAt: time.Now()}

	pq2.Enqueue(vip1)
	pq2.Enqueue(vip2)
	pq2.Enqueue(normal1)
	pq2.Enqueue(normal2)

	peek := pq2.Peek()
	if peek.ID != 10 {
		t.Errorf("expected peek to return ID 10, got %d", peek.ID)
	}

	if pq2.Size() != 4 {
		t.Errorf("expected size 4 after peek, got %d", pq2.Size())
	}

	pending := pq2.GetPendingOrders()
	if len(pending) != 4 {
		t.Errorf("expected 4 pending orders, got %d", len(pending))
	}

	for i, order := range pending {
		expectedIDs := []uint64{10, 20, 30, 40}
		if order.ID != expectedIDs[i] {
			t.Errorf("pending order at position %d: expected ID %d, got %d", i, expectedIDs[i], order.ID)
		}
	}

	pq3 := NewPriorityQueue()
	if pq3.Peek() != nil {
		t.Error("expected nil when peeking empty queue")
	}

	emptyPending := pq3.GetPendingOrders()
	if len(emptyPending) != 0 {
		t.Errorf("expected empty pending orders, got %d", len(emptyPending))
	}
}
