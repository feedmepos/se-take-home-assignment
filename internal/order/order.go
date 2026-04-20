package order

import (
	"fmt"
	"sync"
	"time"
)

// OrderType 订单类型
type OrderType int

const (
	NormalOrder OrderType = iota // 普通订单
	VIPOrder                     // VIP订单
)

// OrderStatus 订单状态
type OrderStatus int

const (
	Pending   OrderStatus = iota // 等待处理
	Processing                   // 处理中
	Completed                    // 已完成
)

// Order 订单结构体
type Order struct {
	ID        int         // 订单ID
	Type      OrderType   // 订单类型
	Status    OrderStatus // 订单状态
	CreatedAt time.Time   // 创建时间
}

// String 返回订单的字符串表示
func (o *Order) String() string {
	orderType := "Normal"
	if o.Type == VIPOrder {
		orderType = "VIP"
	}
	status := "PENDING"
	switch o.Status {
	case Processing:
		status = "PROCESSING"
	case Completed:
		status = "COMPLETE"
	}
	return fmt.Sprintf("Order #%d [%s] - %s", o.ID, orderType, status)
}

// OrderManager 订单管理器
type OrderManager struct {
	mu       sync.Mutex
	orders   []*Order
	nextID   int
	completedOrders []*Order
}

// NewOrderManager 创建新的订单管理器
func NewOrderManager() *OrderManager {
	return &OrderManager{
		orders:          make([]*Order, 0),
		nextID:          1,
		completedOrders: make([]*Order, 0),
	}
}

// AddOrder 添加新订单
func (om *OrderManager) AddOrder(orderType OrderType) *Order {
	om.mu.Lock()
	defer om.mu.Unlock()

	order := &Order{
		ID:        om.nextID,
		Type:      orderType,
		Status:    Pending,
		CreatedAt: time.Now(),
	}
	om.nextID++

	// 根据订单类型插入到正确的位置
	om.insertOrderInPriorityQueue(order)
	
	return order
}

// insertOrderInPriorityQueue 按优先级插入订单（VIP优先，但保持相同类型的顺序）
func (om *OrderManager) insertOrderInPriorityQueue(newOrder *Order) {
	// 默认插到最后
	insertIndex := len(om.orders)
	
	if newOrder.Type == VIPOrder {
		// VIP订单：找到第一个普通订单的位置，插在它前面
		for i, order := range om.orders {
			if order.Type == NormalOrder {
				insertIndex = i
				break
			}
		}
	} else {
		// 普通订单：总是插到最后（在所有VIP和普通订单后面）
		insertIndex = len(om.orders)
	}
	
	// 在正确位置插入订单
	if insertIndex == len(om.orders) {
		om.orders = append(om.orders, newOrder)
	} else {
		om.orders = append(om.orders[:insertIndex], append([]*Order{newOrder}, om.orders[insertIndex:]...)...)
	}
}

// GetNextPendingOrder 获取下一个待处理的订单
func (om *OrderManager) GetNextPendingOrder() *Order {
	om.mu.Lock()
	defer om.mu.Unlock()

	for _, order := range om.orders {
		if order.Status == Pending {
			order.Status = Processing
			return order
		}
	}
	return nil
}

// CompleteOrder 完成订单
func (om *OrderManager) CompleteOrder(orderID int) bool {
	om.mu.Lock()
	defer om.mu.Unlock()

	for i, order := range om.orders {
		if order.ID == orderID && order.Status == Processing {
			order.Status = Completed
			// 将完成的订单移到已完成列表
			om.completedOrders = append(om.completedOrders, order)
			// 从待处理列表中移除
			om.orders = append(om.orders[:i], om.orders[i+1:]...)
			return true
		}
	}
	return false
}

// ReturnOrderToQueue 将订单返回到队列（当bot被移除时）
func (om *OrderManager) ReturnOrderToQueue(order *Order) {
	om.mu.Lock()
	defer om.mu.Unlock()

	// 首先从当前列表中移除该订单（如果存在）
	for i, o := range om.orders {
		if o.ID == order.ID {
			om.orders = append(om.orders[:i], om.orders[i+1:]...)
			break
		}
	}
	
	// 重置订单状态为Pending
	order.Status = Pending
	
	// 按优先级重新插入队列
	om.insertOrderInPriorityQueue(order)
}

// GetPendingOrdersCount 获取待处理订单数量
func (om *OrderManager) GetPendingOrdersCount() int {
	om.mu.Lock()
	defer om.mu.Unlock()

	count := 0
	for _, order := range om.orders {
		if order.Status == Pending {
			count++
		}
	}
	return count
}

// GetProcessingOrdersCount 获取处理中订单数量
func (om *OrderManager) GetProcessingOrdersCount() int {
	om.mu.Lock()
	defer om.mu.Unlock()

	count := 0
	for _, order := range om.orders {
		if order.Status == Processing {
			count++
		}
	}
	return count
}

// GetCompletedOrdersCount 获取已完成订单数量
func (om *OrderManager) GetCompletedOrdersCount() int {
	om.mu.Lock()
	defer om.mu.Unlock()

	return len(om.completedOrders)
}

// GetAllOrders 获取所有订单
func (om *OrderManager) GetAllOrders() []*Order {
	om.mu.Lock()
	defer om.mu.Unlock()

	allOrders := make([]*Order, len(om.orders)+len(om.completedOrders))
	copy(allOrders, om.orders)
	copy(allOrders[len(om.orders):], om.completedOrders)
	
	return allOrders
}

// GetPendingAndProcessingOrders 获取待处理和处理中的订单
func (om *OrderManager) GetPendingAndProcessingOrders() []*Order {
	om.mu.Lock()
	defer om.mu.Unlock()

	result := make([]*Order, len(om.orders))
	copy(result, om.orders)
	
	return result
}
