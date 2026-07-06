package service

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

type OrderType int

const (
	NormalOrder OrderType = iota
	VIPOrder
)

func (o OrderType) String() string {
	if o == VIPOrder {
		return "VIP"
	}
	return "Normal"
}

type Order struct {
	ID        int
	Type      OrderType
	CreatedAt time.Time
}

type Bot struct {
	ID           int
	IsProcessing bool
	CurrentOrder *Order
	StartTime    time.Time
	mu           sync.Mutex
	wakeChan     chan struct{}
	stopChan     chan struct{}
}

type OrderController struct {
	orders         []*Order
	bots           []*Bot
	nextOrderID    int
	nextBotID      int
	mu             sync.RWMutex
	outputFile     *os.File
	totalVIP       int
	totalNormal    int
	completedCount int
}

func NewOrderController(outputPath string) (*OrderController, error) {
	file, err := os.Create(outputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create output file: %v", err)
	}

	controller := &OrderController{
		orders:         make([]*Order, 0),
		bots:           make([]*Bot, 0),
		nextOrderID:    1,
		nextBotID:      1,
		outputFile:     file,
		totalVIP:       0,
		totalNormal:    0,
		completedCount: 0,
	}

	controller.Log("McDonald's Order Management System - Simulation Results\n")
	controller.Log("System initialized with 0 bots")

	return controller, nil
}

func (oc *OrderController) Close() {
	if oc.outputFile != nil {
		oc.LogFinalStatus()
		oc.outputFile.Close()
	}
}

func (oc *OrderController) Log(format string, args ...interface{}) {
	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf(format, args...)
	line := fmt.Sprintf("[%s] %s\n", timestamp, message)

	fmt.Print(line)
	if oc.outputFile != nil {
		oc.outputFile.WriteString(line)
	}
}

func (oc *OrderController) AddNormalOrder() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:        oc.nextOrderID,
		Type:      NormalOrder,
		CreatedAt: time.Now(),
	}
	oc.nextOrderID++
	oc.totalNormal++

	oc.orders = append(oc.orders, order)
	oc.Log("Created Normal Order #%d - Status: PENDING", order.ID)
	oc.logStatusWithLock()

	oc.notifyIdleBots()
}

func (oc *OrderController) AddVIPOrder() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:        oc.nextOrderID,
		Type:      VIPOrder,
		CreatedAt: time.Now(),
	}
	oc.nextOrderID++
	oc.totalVIP++

	insertPos := 0
	for i, o := range oc.orders {
		if o.Type == NormalOrder {
			insertPos = i
			break
		}
		insertPos = i + 1
	}

	newOrders := make([]*Order, 0, len(oc.orders)+1)
	newOrders = append(newOrders, oc.orders[:insertPos]...)
	newOrders = append(newOrders, order)
	newOrders = append(newOrders, oc.orders[insertPos:]...)
	oc.orders = newOrders

	oc.Log("Created VIP Order #%d - Status: PENDING", order.ID)
	oc.logStatusWithLock()

	oc.notifyIdleBots()
}

func (oc *OrderController) AddBot() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	bot := &Bot{
		ID:           oc.nextBotID,
		IsProcessing: false,
		CurrentOrder: nil,
		wakeChan:     make(chan struct{}, 1),
		stopChan:     make(chan struct{}),
	}
	oc.nextBotID++
	oc.bots = append(oc.bots, bot)

	oc.Log("Bot #%d created - Status: ACTIVE", bot.ID)
	oc.logStatusWithLock()

	go oc.processOrders(bot)
}

func (oc *OrderController) notifyIdleBots() {
	for _, b := range oc.bots {
		b.mu.Lock()
		isIdle := !b.IsProcessing && b.CurrentOrder == nil
		b.mu.Unlock()

		if isIdle {
			select {
			case b.wakeChan <- struct{}{}:
			default:
			}
		}
	}
}

func (oc *OrderController) RemoveBot() {
	oc.mu.Lock()

	if len(oc.bots) == 0 {
		oc.mu.Unlock()
		oc.Log("No bots to remove")
		return
	}

	bot := oc.bots[len(oc.bots)-1]
	oc.bots = oc.bots[:len(oc.bots)-1]

	close(bot.stopChan)

	if bot.IsProcessing && bot.CurrentOrder != nil {
		bot.mu.Lock()
		order := bot.CurrentOrder
		bot.IsProcessing = false
		bot.CurrentOrder = nil
		bot.mu.Unlock()

		insertPos := 0
		for i, o := range oc.orders {
			if o.Type == NormalOrder && order.Type == VIPOrder {
				insertPos = i
				break
			}
			if o.Type == order.Type {
				insertPos = i + 1
			}
		}

		newOrders := make([]*Order, 0, len(oc.orders)+1)
		newOrders = append(newOrders, oc.orders[:insertPos]...)
		newOrders = append(newOrders, order)
		newOrders = append(newOrders, oc.orders[insertPos:]...)
		oc.orders = newOrders

		oc.mu.Unlock()
		oc.Log("Bot #%d destroyed while PROCESSING order #%d - Order returned to PENDING", bot.ID, order.ID)
	} else {
		oc.mu.Unlock()
		oc.Log("Bot #%d destroyed while IDLE", bot.ID)
	}

	oc.LogStatus()
}

func (oc *OrderController) processOrders(bot *Bot) {
	for {
		var order *Order
		var shouldLog bool

		oc.mu.Lock()

		if len(oc.bots) == 0 || !oc.botExists(bot.ID) {
			oc.mu.Unlock()
			return
		}

		if len(oc.orders) == 0 {
			bot.mu.Lock()
			bot.IsProcessing = false
			bot.CurrentOrder = nil
			bot.mu.Unlock()
			oc.mu.Unlock()

			select {
			case <-bot.stopChan:
				return
			case <-bot.wakeChan:
				continue
			}
		}

		order = oc.orders[0]
		oc.orders = oc.orders[1:]
		shouldLog = true

		bot.mu.Lock()
		bot.IsProcessing = true
		bot.CurrentOrder = order
		bot.StartTime = time.Now()
		bot.mu.Unlock()

		oc.mu.Unlock()

		if shouldLog {
			oc.Log("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, order.Type, order.ID)
			oc.LogStatus()
		}

		select {
		case <-time.After(10 * time.Second):
			bot.mu.Lock()
			completedOrder := bot.CurrentOrder
			processingTime := time.Since(bot.StartTime).Seconds()
			bot.IsProcessing = false
			bot.CurrentOrder = nil
			bot.mu.Unlock()

			oc.mu.Lock()
			oc.completedCount++
			oc.mu.Unlock()
			oc.Log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %.0fs)", bot.ID, completedOrder.Type, completedOrder.ID, processingTime)
			oc.LogStatus()

			oc.notifyIdleBots()
		case <-bot.stopChan:
			bot.mu.Lock()
			interruptedOrder := bot.CurrentOrder
			bot.IsProcessing = false
			bot.CurrentOrder = nil
			bot.mu.Unlock()

			if interruptedOrder != nil {
				oc.mu.Lock()
				insertPos := 0
				for i, o := range oc.orders {
					if o.Type == NormalOrder && interruptedOrder.Type == VIPOrder {
						insertPos = i
						break
					}
					if o.Type == interruptedOrder.Type {
						insertPos = i + 1
					}
				}

				newOrders := make([]*Order, 0, len(oc.orders)+1)
				newOrders = append(newOrders, oc.orders[:insertPos]...)
				newOrders = append(newOrders, interruptedOrder)
				newOrders = append(newOrders, oc.orders[insertPos:]...)
				oc.orders = newOrders
				oc.mu.Unlock()

				oc.Log("Bot #%d stopped (order #%d returned to queue)", bot.ID, interruptedOrder.ID)
				oc.LogStatus()
			}
			return
		}
	}
}

func (oc *OrderController) botExists(botID int) bool {
	for _, b := range oc.bots {
		if b.ID == botID {
			return true
		}
	}
	return false
}

func (oc *OrderController) LogStatus() {
	oc.mu.RLock()
	defer oc.mu.RUnlock()
	oc.logStatusWithLock()
}

func (oc *OrderController) logStatusWithLock() {
	pendingOrders := make([]string, len(oc.orders))
	for i, o := range oc.orders {
		pendingOrders[i] = fmt.Sprintf("#%d(%s)", o.ID, o.Type)
	}

	activeBots := 0
	idleBots := 0
	for _, b := range oc.bots {
		b.mu.Lock()
		if b.IsProcessing {
			activeBots++
		} else {
			idleBots++
		}
		b.mu.Unlock()
	}

	oc.Log("Queue: [%d pending] | Bots: [%d active, %d idle, %d total]",
		len(oc.orders), activeBots, idleBots, len(oc.bots))
}

func (oc *OrderController) GetStatus() string {
	oc.mu.RLock()
	defer oc.mu.RUnlock()

	pendingOrders := make([]string, len(oc.orders))
	for i, o := range oc.orders {
		pendingOrders[i] = fmt.Sprintf("#%d(%s)", o.ID, o.Type)
	}

	activeBots := 0
	for _, b := range oc.bots {
		b.mu.Lock()
		if b.IsProcessing {
			activeBots++
		}
		b.mu.Unlock()
	}

	return fmt.Sprintf("status: bot: [%d/%d], order: [%s]", activeBots, len(oc.bots), strings.Join(pendingOrders, ", "))
}

func PrintHelp() {
	fmt.Println("\n=== McDonald's Order Controller ===")
	fmt.Println("Commands:")
	fmt.Println("  n  - Add Normal Order")
	fmt.Println("  v  - Add VIP Order")
	fmt.Println("  +  - Add Bot")
	fmt.Println("  -  - Remove Bot")
	fmt.Println("  s  - Show Status")
	fmt.Println("  h  - Show Help")
	fmt.Println("  q  - Quit")
	fmt.Println("====================================")
}

func (oc *OrderController) LogFinalStatus() {
	oc.mu.RLock()
	defer oc.mu.RUnlock()

	vipPending := 0
	normalPending := 0
	for _, o := range oc.orders {
		if o.Type == VIPOrder {
			vipPending++
		} else {
			normalPending++
		}
	}

	activeBots := 0
	for _, b := range oc.bots {
		b.mu.Lock()
		if b.IsProcessing {
			activeBots++
		}
		b.mu.Unlock()
	}

	oc.Log("\nFinal Status:")
	oc.Log("- Total Orders Created: %d (%d VIP, %d Normal)", oc.totalVIP+oc.totalNormal, oc.totalVIP, oc.totalNormal)
	oc.Log("- Orders Completed: %d", oc.completedCount)
	oc.Log("- Orders Pending: %d (%d VIP, %d Normal)", len(oc.orders), vipPending, normalPending)
	oc.Log("- Active Bots: %d", activeBots)
	oc.Log("- Total Bots: %d", len(oc.bots))
}
