package main

import (
	"fmt"
	"os"
	"sync"
	"time"
)

type OrderType string

const (
	Normal OrderType = "NORMAL"
	VIP    OrderType = "VIP"
)

type OrderStatus string

const (
	Pending  OrderStatus = "PENDING"
	Complete OrderStatus = "COMPLETE"
)

type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}

type Bot struct {
	ID         int
	processing *Order
	stopChan   chan bool
	isActive   bool
	mu         sync.Mutex
}

type Restaurant struct {
	orders          []*Order
	completedOrders []*Order
	bots            []*Bot
	nextOrderID     int
	nextBotID       int
	mu              sync.Mutex
	outputFile      *os.File
}

func NewRestaurant(outputPath string) (*Restaurant, error) {
	file, err := os.Create(outputPath)
	if err != nil {
		return nil, err
	}

	return &Restaurant{
		orders:          []*Order{},
		completedOrders: []*Order{},
		bots:            []*Bot{},
		nextOrderID:     1,
		nextBotID:       1,
		outputFile:      file,
	}, nil
}

func (r *Restaurant) log(message string) {
	timestamp := time.Now().Format("15:04:05")
	logMsg := fmt.Sprintf("[%s] %s\n", timestamp, message)
	fmt.Print(logMsg)
	if r.outputFile != nil {
		_, err := r.outputFile.WriteString(logMsg)
		if err != nil {
			fmt.Printf("Error writing to log %v\n", err)
		}
	}
}

func (r *Restaurant) AddNormalOrder() {
	r.mu.Lock()
	defer r.mu.Unlock()

	order := &Order{
		ID:     r.nextOrderID,
		Type:   Normal,
		Status: Pending,
	}
	r.nextOrderID++

	// Add normal order at the end
	r.orders = append(r.orders, order)
	r.log(fmt.Sprintf("New NORMAL Order #%d added to PENDING", order.ID))

	// Notify idle bots
	r.notifyIdleBots()
}

func (r *Restaurant) AddVIPOrder() {
	r.mu.Lock()
	defer r.mu.Unlock()

	order := &Order{
		ID:     r.nextOrderID,
		Type:   VIP,
		Status: Pending,
	}
	r.nextOrderID++

	// Find position: after all VIP orders but before normal orders
	insertPos := 0
	for i, o := range r.orders {
		if o.Type == Normal {
			insertPos = i
			break
		}
		insertPos = i + 1
	}

	// Insert at position
	r.orders = append(r.orders[:insertPos], append([]*Order{order}, r.orders[insertPos:]...)...)
	r.log(fmt.Sprintf("New VIP Order #%d added to PENDING", order.ID))

	// Notify idle bots
	r.notifyIdleBots()
}

func (r *Restaurant) AddBot() {
	r.mu.Lock()

	bot := &Bot{
		ID:       r.nextBotID,
		stopChan: make(chan bool, 1),
		isActive: true,
	}
	r.nextBotID++
	r.bots = append(r.bots, bot)

	r.log(fmt.Sprintf("Bot #%d created", bot.ID))
	r.mu.Unlock()

	// Start bot processing
	go r.runBot(bot)
}

func (r *Restaurant) RemoveBot() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.bots) == 0 {
		r.log("No bots to remove")
		return
	}

	// Remove the newest bot (last in slice)
	bot := r.bots[len(r.bots)-1]
	r.bots = r.bots[:len(r.bots)-1]

	bot.mu.Lock()
	bot.isActive = false
	processingOrder := bot.processing
	bot.mu.Unlock()

	// Stop the bot
	select {
	case bot.stopChan <- true:
	default:
	}

	if processingOrder != nil {
		// Return order to pending
		processingOrder.Status = Pending
		r.orders = append([]*Order{processingOrder}, r.orders...)
		r.log(fmt.Sprintf("Bot #%d removed, Order #%d returned to PENDING", bot.ID, processingOrder.ID))
	} else {
		r.log(fmt.Sprintf("Bot #%d removed", bot.ID))
	}
}

func (r *Restaurant) runBot(bot *Bot) {
	for {
		bot.mu.Lock()
		if !bot.isActive {
			bot.mu.Unlock()
			return
		}
		bot.mu.Unlock()

		// Try to get an order
		order := r.pickupOrder(bot)
		if order == nil {
			// No orders, wait a bit
			select {
			case <-bot.stopChan:
				return
			case <-time.After(100 * time.Millisecond):
				continue
			}
		}

		// Process the order
		r.log(fmt.Sprintf("Bot #%d processing Order #%d (%s)", bot.ID, order.ID, order.Type))

		// Wait 10 seconds or until stopped
		select {
		case <-bot.stopChan:
			// Bot was removed during processing
			return
		case <-time.After(10 * time.Second):
			// Order completed
			r.completeOrder(bot, order)
		}
	}
}

func (r *Restaurant) pickupOrder(bot *Bot) *Order {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.orders) == 0 {
		return nil
	}

	// Get first order
	order := r.orders[0]
	r.orders = r.orders[1:]

	bot.mu.Lock()
	bot.processing = order
	bot.mu.Unlock()

	return order
}

func (r *Restaurant) completeOrder(bot *Bot, order *Order) {
	r.mu.Lock()
	defer r.mu.Unlock()

	bot.mu.Lock()
	bot.processing = nil
	bot.mu.Unlock()

	order.Status = Complete
	r.completedOrders = append(r.completedOrders, order)

	r.log(fmt.Sprintf("Bot #%d completed Order #%d (%s) - moved to COMPLETE", bot.ID, order.ID, order.Type))
}

func (r *Restaurant) notifyIdleBots() {
	// This is called when new orders arrive
	// Bots will pick up work on their next iteration
}

func (r *Restaurant) PrintStatus() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.log("=== Restaurant Status ===")

	r.log(fmt.Sprintf("Active Bots: %d", len(r.bots)))
	for _, bot := range r.bots {
		bot.mu.Lock()
		if bot.processing != nil {
			r.log(fmt.Sprintf("  Bot #%d: Processing Order #%d", bot.ID, bot.processing.ID))
		} else {
			r.log(fmt.Sprintf("  Bot #%d: IDLE", bot.ID))
		}
		bot.mu.Unlock()
	}

	r.log(fmt.Sprintf("PENDING Orders: %d", len(r.orders)))
	for _, order := range r.orders {
		r.log(fmt.Sprintf("  Order #%d (%s)", order.ID, order.Type))
	}

	r.log(fmt.Sprintf("COMPLETE Orders: %d", len(r.completedOrders)))
	for _, order := range r.completedOrders {
		r.log(fmt.Sprintf("  Order #%d (%s)", order.ID, order.Type))
	}
}

func (r *Restaurant) Close() {
	// Stop all bots
	for _, bot := range r.bots {
		bot.mu.Lock()
		bot.isActive = false
		bot.mu.Unlock()
		select {
		case bot.stopChan <- true:
		default:
		}
	}

	if r.outputFile != nil {
		r.outputFile.Close()
	}
}

func main() {
	restaurant, err := NewRestaurant("result.txt")
	if err != nil {
		fmt.Printf("Error creating restaurant: %v\n", err)
		os.Exit(1)
	}
	defer restaurant.Close()

	restaurant.log("McDonald's Order Management System Started")

	// Simulate the scenario
	restaurant.log("\n--- Scenario 1: Normal Orders ---")
	restaurant.AddNormalOrder()
	restaurant.AddNormalOrder()
	time.Sleep(500 * time.Millisecond)
	restaurant.PrintStatus()

	restaurant.log("\n--- Scenario 2: Add Bot ---")
	restaurant.AddBot()
	time.Sleep(500 * time.Millisecond)
	restaurant.PrintStatus()

	restaurant.log("\n--- Scenario 3: Add VIP Order ---")
	restaurant.AddVIPOrder()
	restaurant.AddNormalOrder()
	time.Sleep(500 * time.Millisecond)
	restaurant.PrintStatus()

	restaurant.log("\n--- Scenario 4: Add More Bots ---")
	restaurant.AddBot()
	restaurant.AddBot()
	time.Sleep(500 * time.Millisecond)
	restaurant.PrintStatus()

	restaurant.log("\n--- Waiting for orders to complete ---")
	time.Sleep(12 * time.Second)
	restaurant.PrintStatus()

	restaurant.log("\n--- Scenario 5: Add Mixed Orders ---")
	restaurant.AddVIPOrder()
	restaurant.AddNormalOrder()
	restaurant.AddVIPOrder()
	restaurant.AddNormalOrder()
	time.Sleep(500 * time.Millisecond)
	restaurant.PrintStatus()

	restaurant.log("\n--- Scenario 6: Remove Bot ---")
	time.Sleep(2 * time.Second)
	restaurant.RemoveBot()
	time.Sleep(500 * time.Millisecond)
	restaurant.PrintStatus()

	restaurant.log("\n--- Final Wait ---")
	time.Sleep(15 * time.Second)
	restaurant.PrintStatus()

	restaurant.log("\n=== Simulation Complete ===")
}
