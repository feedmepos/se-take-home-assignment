package code

import (
	"errors"
	"sync"
	"time"
)

// Order represents a customer order with unique ID, type (VIP/NORMAL), and creation timestamp.
type Order struct {
	ID        int       // Unique order identifier
	Type      string    // Order type: "VIP" or "NORMAL"
	CreatedAt time.Time // Timestamp for FIFO ordering within same priority
}

// Order type constants
const (
	OrderTypeNormal = "NORMAL"
	OrderTypeVIP    = "VIP"
)

// Controller manages the order system state including order queues and bot fleet.
// It is the central coordinator between orders and bots, ensuring thread-safe operations.
type Controller struct {
	mu sync.Mutex // Protects all fields below

	vipQueue       []*Order // Priority queue for VIP orders (processed first)
	normalQueue    []*Order // Queue for normal orders (processed after VIP)
	completeOrders []*Order // History of completed orders

	Bots []*Bot // Active bot fleet

	orderID         int // Auto-incrementing order ID counter
	nextBotID       int // Monotonically increasing bot ID (never reused)
	totalVIP        int // Total VIP orders created (lifetime)
	totalNormal     int // Total normal orders created (lifetime)
	completedOrders int // Count of completed orders

	LogFunc func(format string, args ...interface{}) // Optional logging callback
}

// NewController creates a new order controller
func NewController(logFunc func(format string, args ...interface{})) *Controller {
	return &Controller{
		vipQueue:       []*Order{},
		normalQueue:    []*Order{},
		completeOrders: []*Order{},
		Bots:           []*Bot{},
		orderID:        1,
		nextBotID:      1,
		LogFunc:        logFunc,
	}
}

// NewOrder creates a new order and adds it to the appropriate queue
func (c *Controller) NewOrder(orderType string) (*Order, error) {
	if err := ValidateOrderType(orderType); err != nil {
		return nil, err
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	order := &Order{
		ID:        c.orderID,
		Type:      orderType,
		CreatedAt: time.Now(),
	}
	c.orderID++

	if orderType == OrderTypeVIP {
		c.totalVIP++
		c.vipQueue = append(c.vipQueue, order)
	} else {
		c.totalNormal++
		c.normalQueue = append(c.normalQueue, order)
	}

	return order, nil
}

// ValidateOrderType checks if the order type is valid
func ValidateOrderType(orderType string) error {
	if orderType != OrderTypeNormal && orderType != OrderTypeVIP {
		return errors.New("invalid order type: " + orderType)
	}
	return nil
}

// GetNextOrder returns the next order to process (VIP first, then normal)
func (c *Controller) GetNextOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	// VIP orders have priority
	if len(c.vipQueue) > 0 {
		order := c.vipQueue[0]
		c.vipQueue = c.vipQueue[1:]
		return order
	}

	// Then normal orders
	if len(c.normalQueue) > 0 {
		order := c.normalQueue[0]
		c.normalQueue = c.normalQueue[1:]
		return order
	}

	return nil
}

// insertOrderByTime inserts an order into a queue maintaining FIFO order by CreatedAt
func insertOrderByTime(queue []*Order, order *Order) []*Order {
	insertIndex := len(queue)
	for i, existingOrder := range queue {
		if existingOrder.CreatedAt.After(order.CreatedAt) {
			insertIndex = i
			break
		}
	}
	// Insert at the found position
	queue = append(queue, nil)
	copy(queue[insertIndex+1:], queue[insertIndex:])
	queue[insertIndex] = order
	return queue
}

// ReturnOrderToQueue returns an order to its original position maintaining priority and FIFO
func (c *Controller) ReturnOrderToQueue(order *Order) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if order.Type == OrderTypeVIP {
		c.vipQueue = insertOrderByTime(c.vipQueue, order)
	} else {
		c.normalQueue = insertOrderByTime(c.normalQueue, order)
	}
}

// CompleteOrder marks an order as completed
func (c *Controller) CompleteOrder(order *Order) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.completedOrders++
	c.completeOrders = append(c.completeOrders, order)
}

// GetPendingCount returns the number of pending orders
func (c *Controller) GetPendingCount() (vip, normal int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.vipQueue), len(c.normalQueue)
}

// GetStats returns current system statistics
func (c *Controller) GetStats() (totalVIP, totalNormal, completed, pendingVIP, pendingNormal, activeBots int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.totalVIP, c.totalNormal, c.completedOrders, len(c.vipQueue), len(c.normalQueue), len(c.Bots)
}

// GetCompletedOrders returns the list of completed orders
func (c *Controller) GetCompletedOrders() []*Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.completeOrders
}

// GetCompletedCount returns the number of completed orders
func (c *Controller) GetCompletedCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.completedOrders
}

// GetTotalVIP returns the total number of VIP orders created
func (c *Controller) GetTotalVIP() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.totalVIP
}

// GetTotalNormal returns the total number of normal orders created
func (c *Controller) GetTotalNormal() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.totalNormal
}

// Log calls the log function if set
func (c *Controller) Log(format string, args ...interface{}) {
	if c.LogFunc != nil {
		c.LogFunc(format, args...)
	}
}

// GetBot returns the bot at the given index, or nil if out of range.
// Thread-safe access to the Bots slice.
func (c *Controller) GetBot(index int) *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	if index < 0 || index >= len(c.Bots) {
		return nil
	}
	return c.Bots[index]
}

// GetBotCount returns the number of active bots.
// Thread-safe access to the Bots slice length.
func (c *Controller) GetBotCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.Bots)
}

// GetAllBots returns a copy of the bots slice for safe iteration.
// Thread-safe access to the Bots slice.
func (c *Controller) GetAllBots() []*Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	botsCopy := make([]*Bot, len(c.Bots))
	copy(botsCopy, c.Bots)
	return botsCopy
}
