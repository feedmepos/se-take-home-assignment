package simulator

import (
	"fmt"
	"time"

	"order-controller/pkg/order"
)

// Simulator runs a demonstration of the order management system
type Simulator struct {
	orderManager *order.OrderManager
	totalOrders  int
	vipOrders    int
	normalOrders int
}

// NewSimulator creates a new simulator
func NewSimulator(orderManager *order.OrderManager) *Simulator {
	return &Simulator{
		orderManager: orderManager,
	}
}

// Run executes the simulation
func (s *Simulator) Run() error {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()
	
	// Initialize system
	s.logWithTimestamp("System initialized with 0 bots")
	
	// Start with a bot first
	s.addBot()
	time.Sleep(500 * time.Millisecond)
	
	// Create initial VIP order
	s.createOrder(order.VIPOrder, "VIP Order")
	time.Sleep(2 * time.Second)
	
	// Add second bot while first is processing
	s.addBot()
	time.Sleep(1 * time.Second)
	
	// Create multiple normal orders
	s.createOrder(order.NormalOrder, "Normal Order")
	time.Sleep(500 * time.Millisecond)
	
	s.createOrder(order.NormalOrder, "Normal Order")
	time.Sleep(500 * time.Millisecond)
	
	// Add third bot
	s.addBot()
	time.Sleep(1 * time.Second)
	
	// Create another VIP order
	s.createOrder(order.VIPOrder, "VIP Order")
	time.Sleep(1 * time.Second)
	
	// Wait for processing
	time.Sleep(8 * time.Second)
	
	// Remove a bot during processing
	s.removeBot()
	time.Sleep(1 * time.Second)
	
	// Create final order
	s.createOrder(order.NormalOrder, "Normal Order")
	time.Sleep(1 * time.Second)
	
	// Wait for final processing
	time.Sleep(12 * time.Second)
	
	return nil
}

// createOrder creates a new order and logs it
func (s *Simulator) createOrder(orderType order.OrderType, orderTypeName string) {
	ord := s.orderManager.CreateOrder(orderType)
	s.totalOrders++
	if orderType == order.VIPOrder {
		s.vipOrders++
	} else {
		s.normalOrders++
	}
	
	s.logWithTimestamp("New %s #%d received - Status: %s", orderTypeName, ord.ID, ord.Status)
}

// addBot adds a new bot and logs it
func (s *Simulator) addBot() {
	bot := s.orderManager.AddBot()
	s.logWithTimestamp("Cooking bot #%d activated - Status: %s", bot.ID, bot.Status)
}

// removeBot removes the newest bot and logs it
func (s *Simulator) removeBot() {
	bot := s.orderManager.RemoveBot()
	if bot != nil {
		if bot.Status == order.Active && bot.Order != nil {
			s.logWithTimestamp("Bot #%d deactivated during processing of Order #%d", bot.ID, bot.Order.ID)
		} else {
			s.logWithTimestamp("Bot #%d deactivated while %s", bot.ID, bot.Status)
		}
	}
}

// logWithTimestamp logs a message with current timestamp
func (s *Simulator) logWithTimestamp(format string, args ...interface{}) {
	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf(format, args...)
	fmt.Printf("[%s] %s\n", timestamp, message)
}

// GetTotalOrders returns the total number of orders created
func (s *Simulator) GetTotalOrders() int {
	return s.totalOrders
}

// GetVIPOrders returns the number of VIP orders created
func (s *Simulator) GetVIPOrders() int {
	return s.vipOrders
}

// GetNormalOrders returns the number of normal orders created
func (s *Simulator) GetNormalOrders() int {
	return s.normalOrders
}

// GetCompletedOrders returns the number of completed orders
func (s *Simulator) GetCompletedOrders() int {
	orders := s.orderManager.GetOrders()
	completed := 0
	for _, ord := range orders {
		if ord.Status == order.Complete {
			completed++
		}
	}
	return completed
}
