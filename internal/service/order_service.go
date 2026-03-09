package service

import (
	"fmt"
	"sync"
	"time"

	"github.com/hwakman/se-take-home-assignment/internal/bot"
	"github.com/hwakman/se-take-home-assignment/internal/domain"
	"github.com/hwakman/se-take-home-assignment/internal/queue"
	"github.com/hwakman/se-take-home-assignment/pkg/utils"
)

// OrderService coordinates business logic between APIs, the Queue, and Bots
type OrderService struct {
	mu          sync.Mutex
	orders      map[int]*domain.Order
	nextOrderID int
	queue       *queue.OrderQueue
	botManager  *bot.BotManager
}

func NewOrderService() *OrderService {
	q := queue.NewOrderQueue()
	s := &OrderService{
		orders:      make(map[int]*domain.Order),
		nextOrderID: 1,
		queue:       q,
	}

	// Initialize bot manager with callbacks
	s.botManager = bot.NewBotManager(q, s.HandleOrderComplete, s.HandleOrderCancelled, s.HandleOrderStart)

	return s
}

// CreateOrder adds a new order to the system and places it in the high-priority queue
func (s *OrderService) CreateOrder(customerName string, orderType domain.OrderType) *domain.Order {
	s.mu.Lock()
	defer s.mu.Unlock()

	order := &domain.Order{
		ID:           s.nextOrderID,
		CustomerName: customerName,
		OrderType:    orderType,
		Status:       domain.OrderStatusPending,
		CreatedAt:    time.Now(),
	}
	s.nextOrderID++
	s.orders[order.ID] = order

	s.queue.Push(order)
	utils.GetResultLogger().Log("Created %s Order #%d - Status: PENDING", 
		string(order.OrderType), order.ID)
	s.logLocked("Incoming order: " + order.CustomerName)
	return order
}

func (s *OrderService) GetOrder(id int) (*domain.Order, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	order, ok := s.orders[id]
	return order, ok
}

func (s *OrderService) GetAllOrders() []*domain.Order {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	res := make([]*domain.Order, 0, len(s.orders))
	for _, o := range s.orders {
		res = append(res, o)
	}
	return res
}

func (s *OrderService) GetQueue() []*domain.Order {
	return s.queue.GetAll()
}

// SetBotCount delegates resizing the workforce to the BotManager
func (s *OrderService) SetBotCount(count int) {
	s.botManager.SetBotCount(count)
	s.log(fmt.Sprintf("Bot count set to %d", count))
}

func (s *OrderService) GetBots() []*domain.Bot {
	return s.botManager.GetBots()
}

// HandleOrderComplete is a callback triggered when a bot finishes an order
func (s *OrderService) HandleOrderComplete(order *domain.Order) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if o, ok := s.orders[order.ID]; ok {
		o.Status = domain.OrderStatusComplete
		now := time.Now()
		o.CompletedAt = &now
		s.logLocked(fmt.Sprintf("Order %d complete", order.ID))

		// Log to result.txt using template format
		utils.GetResultLogger().Log("Bot completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", 
			order.OrderType, order.ID)
	}
}

// HandleOrderCancelled is a callback triggered if a bot is removed while processing an order
func (s *OrderService) HandleOrderCancelled(order *domain.Order) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// Put back to queue (front for VIP logic?)
	// Actually, the requirement says "ready to process by other bot"
	// So we push it back to the queue. For simplicity, just push it.
	// But according to README: "The order now back to PENDING and ready to process by other bot."
	// Placing it at the front would be better for UX, 
	// but using existing Push logic which handles VIP priority is safer/cleaner.
	s.queue.Push(order)
	s.logLocked(fmt.Sprintf("Order %d returned to queue", order.ID))
}

func (s *OrderService) HandleOrderStart(order *domain.Order, botID int) {
	utils.GetResultLogger().Log("Bot #%d picked up %s Order #%d - Status: PROCESSING", 
		botID, string(order.OrderType), order.ID)
	s.log(fmt.Sprintf("Bot %d started processing Order %d", botID, order.ID))
}

func (s *OrderService) log(action string) {
	active := s.botManager.BotCount()
	inProcess := 0
	for _, b := range s.botManager.GetBots() {
		if b.Status == domain.BotStatusProcessing {
			inProcess++
		}
	}
	inQueue := s.queue.Len()
	completed := 0
	
	s.mu.Lock()
	for _, o := range s.orders {
		if o.Status == domain.OrderStatusComplete {
			completed++
		}
	}
	s.mu.Unlock()

	utils.GetManagerLogger().LogAction(action, active, inProcess, inQueue, completed)
}

// logLocked is used when s.mu is already held
func (s *OrderService) logLocked(action string) {
	active := s.botManager.BotCount()
	inProcess := 0
	for _, b := range s.botManager.GetBots() {
		if b.Status == domain.BotStatusProcessing {
			inProcess++
		}
	}
	inQueue := s.queue.Len()
	completed := 0
	
	for _, o := range s.orders {
		if o.Status == domain.OrderStatusComplete {
			completed++
		}
	}

	utils.GetManagerLogger().LogAction(action, active, inProcess, inQueue, completed)
}
func (s *OrderService) GetSystemStatus() *domain.SystemStatus {
	s.mu.Lock()
	defer s.mu.Unlock()

	active := s.botManager.BotCount()
	inProcess := 0
	for _, b := range s.botManager.GetBots() {
		if b.Status == domain.BotStatusProcessing {
			inProcess++
		}
	}
	inQueue := s.queue.Len()
	completed := 0
	for _, o := range s.orders {
		if o.Status == domain.OrderStatusComplete {
			completed++
		}
	}

	return &domain.SystemStatus{
		ActiveBots:  active,
		InProcess:   inProcess,
		InQueue:     inQueue,
		Completed:   completed,
		LastActions: utils.GetManagerLogger().GetStatus(),
	}
}
