package queue

import (
	"sync"

	"mcmocknald-order-kiosk/internal/domain"
)

// OrderQueue defines the interface for order queue operations
// Following Interface Segregation Principle: focused interface for queue operations
type OrderQueue interface {
	// Enqueue adds an order to the queue
	// Time Complexity: O(1) - appends to appropriate priority list
	Enqueue(order *domain.Order) error

	// Dequeue retrieves and removes the next order from the queue (VIP first, then FIFO)
	// Time Complexity: O(1) - retrieves from front of appropriate priority list
	Dequeue() (*domain.Order, error)

	// EnqueueAtFront adds an order to the front of its priority queue
	// Used when a cook is removed and their order must be re-queued with priority
	// Time Complexity: O(1) - prepends to appropriate priority list
	EnqueueAtFront(order *domain.Order) error

	// Size returns the total number of orders in the queue
	// Time Complexity: O(1) - returns cached count
	Size() int

	// IsEmpty checks if the queue is empty
	// Time Complexity: O(1) - checks cached count
	IsEmpty() bool

	// Peek returns the next order without removing it
	// Time Complexity: O(1) - returns first element without removal
	Peek() (*domain.Order, error)
}

// PriorityQueue implements a hybrid priority + FIFO queue
// VIP orders are prioritized over Regular orders
// Within each priority level, FIFO order is maintained
// Following Single Responsibility Principle: only manages order queue
type PriorityQueue struct {
	vipOrders     []*domain.Order // VIP customer orders (higher priority)
	regularOrders []*domain.Order // Regular customer orders (lower priority)
	mu            sync.RWMutex    // Protects concurrent access to the queue
	size          int             // Cached total size for O(1) lookup
}

// NewPriorityQueue creates a new priority queue instance
// Time Complexity: O(1)
func NewPriorityQueue() *PriorityQueue {
	return &PriorityQueue{
		vipOrders:     make([]*domain.Order, 0, 1000), // Pre-allocate for performance
		regularOrders: make([]*domain.Order, 0, 1000), // Pre-allocate for performance
		size:          0,
	}
}

// Enqueue adds an order to the appropriate queue based on customer type
// VIP orders go to vipOrders, Regular orders go to regularOrders
// Time Complexity: O(1) - append operation is amortized O(1)
func (pq *PriorityQueue) Enqueue(order *domain.Order) error {
	if order == nil {
		return ErrNilOrder
	}

	pq.mu.Lock()
	defer pq.mu.Unlock()

	// Determine priority based on customer role
	if order.CustomerRole == domain.RoleVIPCustomer {
		pq.vipOrders = append(pq.vipOrders, order)
	} else {
		pq.regularOrders = append(pq.regularOrders, order)
	}

	pq.size++
	return nil
}

// Dequeue retrieves and removes the next order from the queue
// Priority: VIP orders first, then Regular orders (FIFO within each priority)
// Time Complexity: O(1) - removes from front of slice (with slice re-slicing)
// Note: Includes periodic memory optimization to prevent unbounded growth
func (pq *PriorityQueue) Dequeue() (*domain.Order, error) {
	pq.mu.Lock()
	defer pq.mu.Unlock()

	if pq.size == 0 {
		return nil, ErrEmptyQueue
	}

	var order *domain.Order

	// VIP orders have priority
	if len(pq.vipOrders) > 0 {
		order = pq.vipOrders[0]
		pq.vipOrders[0] = nil // Clear reference for GC
		pq.vipOrders = pq.vipOrders[1:] // Remove first element (FIFO)

		// Reset slice if wasted capacity exceeds threshold (prevent memory bloat)
		if cap(pq.vipOrders)-len(pq.vipOrders) > 1000 {
			newSlice := make([]*domain.Order, len(pq.vipOrders))
			copy(newSlice, pq.vipOrders)
			pq.vipOrders = newSlice
		}
	} else if len(pq.regularOrders) > 0 {
		order = pq.regularOrders[0]
		pq.regularOrders[0] = nil // Clear reference for GC
		pq.regularOrders = pq.regularOrders[1:] // Remove first element (FIFO)

		// Reset slice if wasted capacity exceeds threshold (prevent memory bloat)
		if cap(pq.regularOrders)-len(pq.regularOrders) > 1000 {
			newSlice := make([]*domain.Order, len(pq.regularOrders))
			copy(newSlice, pq.regularOrders)
			pq.regularOrders = newSlice
		}
	}

	pq.size--
	return order, nil
}

// EnqueueAtFront adds an order to the front of its priority queue
// Used when a cook is removed and their order must be re-queued with priority (#1 position)
// Time Complexity: O(n) where n is the size of the priority queue (due to slice prepend)
// Note: This is acceptable as it's only called when a cook is removed, which is infrequent
func (pq *PriorityQueue) EnqueueAtFront(order *domain.Order) error {
	if order == nil {
		return ErrNilOrder
	}

	pq.mu.Lock()
	defer pq.mu.Unlock()

	// Determine priority based on customer role
	if order.CustomerRole == domain.RoleVIPCustomer {
		// Prepend to VIP orders
		pq.vipOrders = append([]*domain.Order{order}, pq.vipOrders...)
	} else {
		// Prepend to Regular orders
		pq.regularOrders = append([]*domain.Order{order}, pq.regularOrders...)
	}

	pq.size++
	return nil
}

// Size returns the total number of orders in the queue
// Time Complexity: O(1) - returns cached count
func (pq *PriorityQueue) Size() int {
	pq.mu.RLock()
	defer pq.mu.RUnlock()
	return pq.size
}

// IsEmpty checks if the queue is empty
// Time Complexity: O(1) - checks cached count
func (pq *PriorityQueue) IsEmpty() bool {
	pq.mu.RLock()
	defer pq.mu.RUnlock()
	return pq.size == 0
}

// Peek returns the next order without removing it
// Time Complexity: O(1) - returns first element without removal
func (pq *PriorityQueue) Peek() (*domain.Order, error) {
	pq.mu.RLock()
	defer pq.mu.RUnlock()

	if pq.size == 0 {
		return nil, ErrEmptyQueue
	}

	// VIP orders have priority
	if len(pq.vipOrders) > 0 {
		return pq.vipOrders[0], nil
	}

	if len(pq.regularOrders) > 0 {
		return pq.regularOrders[0], nil
	}

	return nil, ErrEmptyQueue
}
