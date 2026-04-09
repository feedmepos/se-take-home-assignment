package order

import (
	"sync"

	"github.com/feedme/order-controller/internal/dao/order"
	"github.com/feedme/order-controller/pkg/unique"
)

// Manager handles order management with VIP priority
type Manager struct {
	mu              sync.RWMutex
	orders          map[int64]*order.Order
	pendingVIP      []*order.Order
	pendingNormal   []*order.Order
	processedVIP    int
	processedNormal int
}

// NewManager creates a new order manager
func NewManager() *Manager {
	return &Manager{
		orders:        make(map[int64]*order.Order),
		pendingVIP:    make([]*order.Order, 0),
		pendingNormal: make([]*order.Order, 0),
	}
}

// CreateOrder creates a new order and adds it to the pending queue
func (m *Manager) CreateOrder(orderType order.OrderType) *order.Order {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := unique.NextID()

	o := &order.Order{
		Id:     id,
		Type:   orderType,
		Status: order.Pending,
	}

	m.orders[o.Id] = o

	// Add to appropriate queue maintaining priority
	if orderType == order.VIP {
		// VIP orders go behind existing VIPs but ahead of all Normal
		m.pendingVIP = append(m.pendingVIP, o)
	} else {
		// Normal orders go to the back of the normal queue
		m.pendingNormal = append(m.pendingNormal, o)
	}

	return o
}

// GetNextPendingOrder returns the next pending order (VIP first, then Normal)
func (m *Manager) GetNextPendingOrder() *order.Order {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Always prefer VIP orders first
	if len(m.pendingVIP) > 0 {
		o := m.pendingVIP[0]
		m.pendingVIP = m.pendingVIP[1:]
		o.Status = order.Processing
		return o
	}

	// Then process Normal orders
	if len(m.pendingNormal) > 0 {
		o := m.pendingNormal[0]
		m.pendingNormal = m.pendingNormal[1:]
		o.Status = order.Processing
		return o
	}

	return nil
}

// ReturnOrderToPending returns an order to pending queue with correct priority
func (m *Manager) ReturnOrderToPending(o *order.Order) {
	m.mu.Lock()
	defer m.mu.Unlock()

	o.Status = order.Pending

	if o.Type == order.VIP {
		// VIP order goes to front of VIP queue
		m.pendingVIP = m.returnOrderSorted(m.pendingVIP, o)
	} else {
		// Normal order goes to front of normal queue
		m.pendingNormal = m.returnOrderSorted(m.pendingNormal, o)
	}
}

func (m *Manager) returnOrderSorted(orders []*order.Order, o *order.Order) []*order.Order {
	i := 0
	for i < len(orders) && orders[i].Id < o.Id {
		i++
	}
	orders = append(orders, nil)
	copy(orders[i+1:], orders[i:])
	orders[i] = o

	return orders
}

// CompleteOrder marks an order as complete
func (m *Manager) CompleteOrder(id int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if o, exists := m.orders[id]; exists {
		o.Status = order.Complete
		if o.Type == order.VIP {
			m.processedVIP++
		} else {
			m.processedNormal++
		}
	}
}

// GetOrder retrieves an order by ID
func (m *Manager) GetOrder(id int64) (*order.Order, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	o, exists := m.orders[id]
	return o, exists
}

// GetStats returns order statistics
func (m *Manager) GetStats() (totalVIP, totalNormal, completedVIP, completedNormal int, totalPending int) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	pendingVIP := len(m.pendingVIP)
	pendingNormal := len(m.pendingNormal)
	for _, o := range m.orders {
		if o.Status == order.Complete {
			if o.Type == order.VIP {
				completedVIP++
			} else {
				completedNormal++
			}
		}
	}

	totalVIP = pendingVIP + m.processedVIP
	totalNormal = pendingNormal + m.processedNormal

	return totalVIP, totalNormal, completedVIP, completedNormal, pendingVIP + pendingNormal
}
