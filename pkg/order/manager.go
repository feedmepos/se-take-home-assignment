package order

import (
	"container/heap"
	"sync"
	"time"
)

// OrderManager manages orders and bots
type OrderManager struct {
	orders     []*Order
	bots       []*Bot
	nextOrderID int
	nextBotID   int
	mu          sync.RWMutex
	orderHeap   *OrderHeap
}

// OrderHeap implements heap.Interface for priority queue
type OrderHeap struct {
	orders []*Order
}

func (h OrderHeap) Len() int { return len(h.orders) }

func (h OrderHeap) Less(i, j int) bool {
	// VIP orders have higher priority (lower index in heap)
	if h.orders[i].Type != h.orders[j].Type {
		return h.orders[i].Type == VIPOrder
	}
	// For same type, earlier orders have higher priority
	return h.orders[i].ID < h.orders[j].ID
}

func (h OrderHeap) Swap(i, j int) {
	h.orders[i], h.orders[j] = h.orders[j], h.orders[i]
}

func (h *OrderHeap) Push(x interface{}) {
	h.orders = append(h.orders, x.(*Order))
}

func (h *OrderHeap) Pop() interface{} {
	old := h.orders
	n := len(old)
	order := old[n-1]
	h.orders = old[0 : n-1]
	return order
}

// NewManager creates a new OrderManager
func NewManager() *OrderManager {
	orderHeap := &OrderHeap{}
	heap.Init(orderHeap)
	
	return &OrderManager{
		orders:     make([]*Order, 0),
		bots:       make([]*Bot, 0),
		nextOrderID: 1001,
		nextBotID:   1,
		orderHeap:   orderHeap,
	}
}

// CreateOrder creates a new order
func (om *OrderManager) CreateOrder(orderType OrderType) *Order {
	om.mu.Lock()
	defer om.mu.Unlock()
	
	order := &Order{
		ID:      om.nextOrderID,
		Type:    orderType,
		Status:  Pending,
		Created: time.Now(),
	}
	
	om.nextOrderID++
	om.orders = append(om.orders, order)
	heap.Push(om.orderHeap, order)
	
	return order
}

// AddBot adds a new bot to the system
func (om *OrderManager) AddBot() *Bot {
	om.mu.Lock()
	defer om.mu.Unlock()
	
	bot := &Bot{
		ID:      om.nextBotID,
		Status:  Idle,
		Created: time.Now(),
	}
	
	om.nextBotID++
	om.bots = append(om.bots, bot)
	
	// Start processing if there are pending orders
	go om.processOrders(bot)
	
	return bot
}

// RemoveBot removes the newest bot
func (om *OrderManager) RemoveBot() *Bot {
	om.mu.Lock()
	defer om.mu.Unlock()
	
	if len(om.bots) == 0 {
		return nil
	}
	
	// Remove the last bot (newest)
	botIndex := len(om.bots) - 1
	bot := om.bots[botIndex]
	om.bots = om.bots[:botIndex]
	
	// If bot was processing an order, put it back to pending
	if bot.Status == Active && bot.Order != nil {
		bot.Order.Status = Pending
		bot.Order.Started = nil
		heap.Push(om.orderHeap, bot.Order)
		bot.Order = nil
	}
	
	return bot
}

// processOrders handles order processing for a bot
func (om *OrderManager) processOrders(bot *Bot) {
	for {
		om.mu.Lock()
		
		// Check if bot still exists
		botExists := false
		for _, b := range om.bots {
			if b.ID == bot.ID {
				botExists = true
				break
			}
		}
		
		if !botExists {
			om.mu.Unlock()
			return
		}
		
		// Get next order from priority queue
		if om.orderHeap.Len() == 0 {
			bot.Status = Idle
			om.mu.Unlock()
			time.Sleep(100 * time.Millisecond) // Check again soon
			continue
		}
		
		order := heap.Pop(om.orderHeap).(*Order)
		order.Status = Processing
		now := time.Now()
		order.Started = &now
		
		bot.Status = Active
		bot.Order = order
		
		om.mu.Unlock()
		
		// Process order for 10 seconds
		time.Sleep(10 * time.Second)
		
		om.mu.Lock()
		// Check if bot still exists and is still processing this order
		botStillExists := false
		for _, b := range om.bots {
			if b.ID == bot.ID && b.Order != nil && b.Order.ID == order.ID {
				botStillExists = true
				break
			}
		}
		
		if botStillExists {
			order.Status = Complete
			completed := time.Now()
			order.Completed = &completed
			bot.Status = Idle
			bot.Order = nil
		}
		om.mu.Unlock()
	}
}

// GetPendingOrderCount returns the number of pending orders
func (om *OrderManager) GetPendingOrderCount() int {
	om.mu.RLock()
	defer om.mu.RUnlock()
	return om.orderHeap.Len()
}

// GetActiveBotCount returns the number of active bots
func (om *OrderManager) GetActiveBotCount() int {
	om.mu.RLock()
	defer om.mu.RUnlock()
	return len(om.bots)
}

// GetOrders returns all orders
func (om *OrderManager) GetOrders() []*Order {
	om.mu.RLock()
	defer om.mu.RUnlock()
	return append([]*Order{}, om.orders...)
}

// GetBots returns all bots
func (om *OrderManager) GetBots() []*Bot {
	om.mu.RLock()
	defer om.mu.RUnlock()
	return append([]*Bot{}, om.bots...)
}

// GetPendingOrders returns pending orders in priority order
func (om *OrderManager) GetPendingOrders() []*Order {
	om.mu.RLock()
	defer om.mu.RUnlock()
	
	// Create a copy of the heap to avoid modifying the original
	tempHeap := &OrderHeap{}
	heap.Init(tempHeap)
	
	for _, order := range om.orderHeap.orders {
		heap.Push(tempHeap, order)
	}
	
	var pendingOrders []*Order
	for tempHeap.Len() > 0 {
		pendingOrders = append(pendingOrders, heap.Pop(tempHeap).(*Order))
	}
	
	return pendingOrders
}
