package main

import (
	"fmt"
	"os"
	"sync"
	"time"
)

type Manager struct {
	Orders      []*Order
	Bots        []*Bot
	NextOrderID int
	NextBotID   int
	mu          sync.Mutex
}

func NewManager() *Manager {
	return &Manager{
		Orders:      make([]*Order, 0),
		Bots:        make([]*Bot, 0),
		NextOrderID: 1,
		NextBotID:   1,
	}
}

// AddOrder adds a new order to the queue respecting VIP priority
func (m *Manager) AddOrder(orderType OrderType) *Order {
	m.mu.Lock()
	defer m.mu.Unlock()

	order := &Order{
		ID:        m.NextOrderID,
		Type:      orderType,
		Status:    StatusPending,
		CreatedAt: time.Now(),
	}
	m.NextOrderID++

	// Insert Logic:
	// VIP: After last VIP, before first Normal.
	// Normal: At the end.
	if orderType == TypeNormal {
		m.Orders = append(m.Orders, order)
	} else {
		// Find insertion point for VIP
		insertIndex := len(m.Orders)
		// Find the index of the first "Pending" "Normal" order.
		foundNormal := false
		for i, o := range m.Orders {
			if o.Status == StatusPending && o.Type == TypeNormal {
				insertIndex = i
				foundNormal = true
				break
			}
		}
		
		if foundNormal {
			// Insert at index
			m.Orders = append(m.Orders[:insertIndex+1], m.Orders[insertIndex:]...)
			m.Orders[insertIndex] = order
		} else {
			m.Orders = append(m.Orders, order)
		}
	}

	m.TriggerBots()
	return order
}

// AddBot adds a new bot
func (m *Manager) AddBot() *Bot {
	m.mu.Lock()
	defer m.mu.Unlock()

	bot := &Bot{
		ID:     m.NextBotID,
		Status: BotIdle,
	}
	m.NextBotID++
	m.Bots = append(m.Bots, bot)
	
	m.TriggerBots()
	return bot
}

// RemoveBot removes the newest bot
func (m *Manager) RemoveBot() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.Bots) == 0 {
		return
	}

	// Remove the last bot (newest)
	bot := m.Bots[len(m.Bots)-1]
	m.Bots = m.Bots[:len(m.Bots)-1]

	// If bot was processing, reset the order to pending
	if bot.Status == BotProcessing && bot.CurrentOrderID != 0 {
		for _, o := range m.Orders {
			if o.ID == bot.CurrentOrderID {
				o.Status = StatusPending
				break
			}
		}
	}
}

func (m *Manager) TriggerBots() {
	go m.processLoop()
}

func (m *Manager) processLoop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Find idle bots and pending orders
	for _, bot := range m.Bots {
		if bot.Status == BotIdle {
			// Find first pending order
			for _, order := range m.Orders {
				if order.Status == StatusPending {
					// Assign
					bot.Status = BotProcessing
					bot.CurrentOrderID = order.ID
					order.Status = StatusProcessing
					
					// Start processing in background
					go m.processOrder(bot.ID, order.ID)
					break // Bot is now busy
				}
			}
		}
	}
}

func (m *Manager) processOrder(botID, orderID int) {
	time.Sleep(10 * time.Second)

	m.mu.Lock()
	defer m.mu.Unlock()

	// Verify bot still exists
	botIdx := -1
	for i, b := range m.Bots {
		if b.ID == botID {
			botIdx = i
			break
		}
	}

	if botIdx == -1 {
		return
	}

	bot := m.Bots[botIdx]
	if bot.CurrentOrderID != orderID {
		return
	}

	// Mark Complete
	for _, o := range m.Orders {
		if o.ID == orderID {
			if o.Status == StatusProcessing {
				o.Status = StatusComplete
				m.LogCompletion(o)
			}
			break
		}
	}

	// Reset Bot
	bot.Status = BotIdle
	bot.CurrentOrderID = 0

	// Trigger again for this bot
	go func() {
		m.processLoop()
	}()
}

// LogCompletion prints the completion event to standard output
func (m *Manager) LogCompletion(order *Order) {
	fmt.Printf("Order %d %s completed at %s\n", 
		order.ID, order.Type, time.Now().Format("15:04:05"))
}
