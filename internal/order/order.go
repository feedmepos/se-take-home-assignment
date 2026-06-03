package order

import (
	"sort"
	"time"
)

const ProcessingDuration = 10 * time.Second

type OrderKind string

const (
	Normal OrderKind = "Normal"
	VIP    OrderKind = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID          int
	Kind        OrderKind
	Status      OrderStatus
	CreatedAt   time.Time
	StartedAt   time.Time
	CompletedAt time.Time
	BotID       int
}

func (c *Controller) AddNormalOrder() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.addOrder(Normal)
	c.processPendingOrders()
}

func (c *Controller) AddVIPOrder() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.addOrder(VIP)
	c.processPendingOrders()
}

func (c *Controller) pendingOrders() []*Order {
	pending := make([]*Order, 0, len(c.pendingVIP)+len(c.pendingNormal))
	pending = append(pending, c.pendingVIP...)
	pending = append(pending, c.pendingNormal...)
	return pending
}

func (c *Controller) addOrder(kind OrderKind) {
	order := &Order{
		ID:        c.nextOrderID(),
		Kind:      kind,
		Status:    Pending,
		CreatedAt: c.now(),
	}

	c.enqueuePendingOrder(order)
	c.logEvent("Created %s Order #%d - Status: %s", order.Kind, order.ID, order.Status)
}

func (c *Controller) enqueuePendingOrder(order *Order) {
	switch order.Kind {
	case VIP:
		c.pendingVIP = insertPendingOrder(c.pendingVIP, order)
	default:
		c.pendingNormal = insertPendingOrder(c.pendingNormal, order)
	}
}

func insertPendingOrder(queue []*Order, order *Order) []*Order {
	queue = append(queue, order)
	sort.SliceStable(queue, func(i, j int) bool {
		return queue[i].ID < queue[j].ID
	})
	return queue
}
