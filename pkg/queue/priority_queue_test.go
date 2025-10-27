package queue

import (
	"sync"
	"testing"

	"mcmocknald-order-kiosk/internal/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewPriorityQueue tests the creation of a new priority queue
func TestNewPriorityQueue(t *testing.T) {
	pq := NewPriorityQueue()

	assert.NotNil(t, pq, "Priority queue should not be nil")
	assert.Equal(t, 0, pq.Size(), "New queue should be empty")
	assert.True(t, pq.IsEmpty(), "New queue should report as empty")
}

// TestEnqueueRegularOrder tests enqueueing a regular order
func TestEnqueueRegularOrder(t *testing.T) {
	pq := NewPriorityQueue()

	order := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}

	err := pq.Enqueue(order)

	require.NoError(t, err, "Enqueue should not return error")
	assert.Equal(t, 1, pq.Size(), "Queue size should be 1")
	assert.False(t, pq.IsEmpty(), "Queue should not be empty")
}

// TestEnqueueVIPOrder tests enqueueing a VIP order
func TestEnqueueVIPOrder(t *testing.T) {
	pq := NewPriorityQueue()

	order := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleVIPCustomer,
		Status:       domain.OrderStatusPending,
	}

	err := pq.Enqueue(order)

	require.NoError(t, err, "Enqueue should not return error")
	assert.Equal(t, 1, pq.Size(), "Queue size should be 1")
	assert.False(t, pq.IsEmpty(), "Queue should not be empty")
}

// TestEnqueueNilOrder tests that enqueueing a nil order returns an error
func TestEnqueueNilOrder(t *testing.T) {
	pq := NewPriorityQueue()

	err := pq.Enqueue(nil)

	assert.ErrorIs(t, err, ErrNilOrder, "Should return ErrNilOrder")
	assert.Equal(t, 0, pq.Size(), "Queue size should remain 0")
}

// TestDequeueFromEmptyQueue tests dequeuing from an empty queue
func TestDequeueFromEmptyQueue(t *testing.T) {
	pq := NewPriorityQueue()

	order, err := pq.Dequeue()

	assert.ErrorIs(t, err, ErrEmptyQueue, "Should return ErrEmptyQueue")
	assert.Nil(t, order, "Order should be nil")
}

// TestDequeueRegularOrder tests dequeuing a regular order
func TestDequeueRegularOrder(t *testing.T) {
	pq := NewPriorityQueue()

	expected := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}

	err := pq.Enqueue(expected)
	require.NoError(t, err)

	order, err := pq.Dequeue()

	require.NoError(t, err, "Dequeue should not return error")
	assert.Equal(t, expected.ID, order.ID, "Should dequeue the correct order")
	assert.Equal(t, 0, pq.Size(), "Queue should be empty after dequeue")
	assert.True(t, pq.IsEmpty(), "Queue should report as empty")
}

// TestVIPPriority tests that VIP orders are dequeued before regular orders
func TestVIPPriority(t *testing.T) {
	pq := NewPriorityQueue()

	// Enqueue regular order first
	regularOrder := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}
	err := pq.Enqueue(regularOrder)
	require.NoError(t, err)

	// Then enqueue VIP order
	vipOrder := &domain.Order{
		ID:           2,
		CustomerRole: domain.RoleVIPCustomer,
		Status:       domain.OrderStatusPending,
	}
	err = pq.Enqueue(vipOrder)
	require.NoError(t, err)

	// VIP order should be dequeued first despite being added second
	order, err := pq.Dequeue()
	require.NoError(t, err)
	assert.Equal(t, vipOrder.ID, order.ID, "VIP order should be dequeued first")

	// Regular order should be dequeued next
	order, err = pq.Dequeue()
	require.NoError(t, err)
	assert.Equal(t, regularOrder.ID, order.ID, "Regular order should be dequeued second")
}

// TestFIFOWithinPriority tests that FIFO order is maintained within each priority level
func TestFIFOWithinPriority(t *testing.T) {
	pq := NewPriorityQueue()

	// Enqueue multiple regular orders
	for i := 1; i <= 3; i++ {
		order := &domain.Order{
			ID:           i,
			CustomerRole: domain.RoleRegularCustomer,
			Status:       domain.OrderStatusPending,
		}
		err := pq.Enqueue(order)
		require.NoError(t, err)
	}

	// Enqueue multiple VIP orders
	for i := 4; i <= 6; i++ {
		order := &domain.Order{
			ID:           i,
			CustomerRole: domain.RoleVIPCustomer,
			Status:       domain.OrderStatusPending,
		}
		err := pq.Enqueue(order)
		require.NoError(t, err)
	}

	// VIP orders should come out first in FIFO order
	expectedOrder := []int{4, 5, 6, 1, 2, 3}
	for _, expectedID := range expectedOrder {
		order, err := pq.Dequeue()
		require.NoError(t, err)
		assert.Equal(t, expectedID, order.ID, "Orders should be dequeued in priority+FIFO order")
	}

	assert.True(t, pq.IsEmpty(), "Queue should be empty after all dequeues")
}

// TestEnqueueAtFront tests adding an order to the front of the queue
func TestEnqueueAtFront(t *testing.T) {
	pq := NewPriorityQueue()

	// Enqueue regular orders
	order1 := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}
	err := pq.Enqueue(order1)
	require.NoError(t, err)

	order2 := &domain.Order{
		ID:           2,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}
	err = pq.Enqueue(order2)
	require.NoError(t, err)

	// Enqueue at front
	frontOrder := &domain.Order{
		ID:           3,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}
	err = pq.EnqueueAtFront(frontOrder)
	require.NoError(t, err)

	// Front order should be dequeued first
	order, err := pq.Dequeue()
	require.NoError(t, err)
	assert.Equal(t, frontOrder.ID, order.ID, "Front order should be dequeued first")

	// Then original orders in FIFO order
	order, err = pq.Dequeue()
	require.NoError(t, err)
	assert.Equal(t, order1.ID, order.ID)

	order, err = pq.Dequeue()
	require.NoError(t, err)
	assert.Equal(t, order2.ID, order.ID)
}

// TestEnqueueAtFrontVIP tests adding a VIP order to the front
func TestEnqueueAtFrontVIP(t *testing.T) {
	pq := NewPriorityQueue()

	// Enqueue VIP orders
	order1 := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleVIPCustomer,
		Status:       domain.OrderStatusPending,
	}
	err := pq.Enqueue(order1)
	require.NoError(t, err)

	// Enqueue at front
	frontOrder := &domain.Order{
		ID:           2,
		CustomerRole: domain.RoleVIPCustomer,
		Status:       domain.OrderStatusPending,
	}
	err = pq.EnqueueAtFront(frontOrder)
	require.NoError(t, err)

	// Front order should be dequeued first
	order, err := pq.Dequeue()
	require.NoError(t, err)
	assert.Equal(t, frontOrder.ID, order.ID, "Front VIP order should be dequeued first")
}

// TestEnqueueAtFrontNilOrder tests that enqueueing nil at front returns an error
func TestEnqueueAtFrontNilOrder(t *testing.T) {
	pq := NewPriorityQueue()

	err := pq.EnqueueAtFront(nil)

	assert.ErrorIs(t, err, ErrNilOrder, "Should return ErrNilOrder")
	assert.Equal(t, 0, pq.Size(), "Queue size should remain 0")
}

// TestPeek tests peeking at the next order without removing it
func TestPeek(t *testing.T) {
	pq := NewPriorityQueue()

	order := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}
	err := pq.Enqueue(order)
	require.NoError(t, err)

	// Peek should return the order without removing it
	peeked, err := pq.Peek()
	require.NoError(t, err)
	assert.Equal(t, order.ID, peeked.ID, "Peek should return the correct order")
	assert.Equal(t, 1, pq.Size(), "Queue size should remain 1 after peek")

	// Peek again should return the same order
	peeked2, err := pq.Peek()
	require.NoError(t, err)
	assert.Equal(t, order.ID, peeked2.ID, "Peek should return the same order")
}

// TestPeekEmptyQueue tests peeking at an empty queue
func TestPeekEmptyQueue(t *testing.T) {
	pq := NewPriorityQueue()

	order, err := pq.Peek()

	assert.ErrorIs(t, err, ErrEmptyQueue, "Should return ErrEmptyQueue")
	assert.Nil(t, order, "Order should be nil")
}

// TestPeekVIPPriority tests that peek returns VIP orders first
func TestPeekVIPPriority(t *testing.T) {
	pq := NewPriorityQueue()

	// Enqueue regular order first
	regularOrder := &domain.Order{
		ID:           1,
		CustomerRole: domain.RoleRegularCustomer,
		Status:       domain.OrderStatusPending,
	}
	err := pq.Enqueue(regularOrder)
	require.NoError(t, err)

	// Then enqueue VIP order
	vipOrder := &domain.Order{
		ID:           2,
		CustomerRole: domain.RoleVIPCustomer,
		Status:       domain.OrderStatusPending,
	}
	err = pq.Enqueue(vipOrder)
	require.NoError(t, err)

	// Peek should return VIP order
	peeked, err := pq.Peek()
	require.NoError(t, err)
	assert.Equal(t, vipOrder.ID, peeked.ID, "Peek should return VIP order first")
}

// TestConcurrency tests concurrent enqueue and dequeue operations
func TestConcurrency(t *testing.T) {
	pq := NewPriorityQueue()
	const numGoroutines = 100
	const ordersPerGoroutine = 10

	var wg sync.WaitGroup

	// Concurrent enqueues
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()
			for j := 0; j < ordersPerGoroutine; j++ {
				order := &domain.Order{
					ID:           goroutineID*ordersPerGoroutine + j,
					CustomerRole: domain.RoleRegularCustomer,
					Status:       domain.OrderStatusPending,
				}
				pq.Enqueue(order)
			}
		}(i)
	}

	wg.Wait()

	expectedSize := numGoroutines * ordersPerGoroutine
	assert.Equal(t, expectedSize, pq.Size(), "All orders should be enqueued")

	// Concurrent dequeues
	successfulDequeues := 0
	var dequeueMu sync.Mutex

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < ordersPerGoroutine; j++ {
				_, err := pq.Dequeue()
				if err == nil {
					dequeueMu.Lock()
					successfulDequeues++
					dequeueMu.Unlock()
				}
			}
		}()
	}

	wg.Wait()

	assert.Equal(t, expectedSize, successfulDequeues, "All orders should be dequeued")
	assert.Equal(t, 0, pq.Size(), "Queue should be empty")
	assert.True(t, pq.IsEmpty(), "Queue should report as empty")
}

// TestMixedConcurrentOperations tests mixed concurrent operations
func TestMixedConcurrentOperations(t *testing.T) {
	pq := NewPriorityQueue()
	var wg sync.WaitGroup

	// Concurrent mixed operations
	for i := 0; i < 50; i++ {
		wg.Add(3)

		// Enqueue goroutine
		go func(id int) {
			defer wg.Done()
			order := &domain.Order{
				ID:           id,
				CustomerRole: domain.RoleRegularCustomer,
				Status:       domain.OrderStatusPending,
			}
			pq.Enqueue(order)
		}(i)

		// Dequeue goroutine
		go func() {
			defer wg.Done()
			pq.Dequeue() // May succeed or fail, both are valid
		}()

		// Peek goroutine
		go func() {
			defer wg.Done()
			pq.Peek() // May succeed or fail, both are valid
		}()
	}

	wg.Wait()

	// Final size should be consistent (no race conditions)
	size := pq.Size()
	assert.GreaterOrEqual(t, size, 0, "Size should never be negative")
}
