// simulation.go
package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

type OrderType string
type OrderStatus string
type BotStatus string

const (
	VIP    OrderType = "VIP"
	NORMAL OrderType = "NORMAL"
)

const (
	PENDING    OrderStatus = "PENDING"
	PROCESSING OrderStatus = "PROCESSING"
	COMPLETE   OrderStatus = "COMPLETE"
)

const (
	ACTIVE BotStatus = "ACTIVE"
	IDLE   BotStatus = "IDLE"
)

type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	StartedAt   time.Time
	CompletedAt time.Time
	Position    int // For maintaining order in pending queue
}

type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order
}

type Simulation struct {
	orders        map[int]*Order
	bots          map[int]*Bot
	nextOrderID   int
	nextBotID     int
	pendingVIP    []*Order
	pendingNormal []*Order
	mu            sync.RWMutex
	output        *os.File
	orderCounter  int
}

func NewSimulation() *Simulation {
	// Create or truncate result.txt
	output, err := os.Create("result.txt")
	if err != nil {
		fmt.Printf("Error creating result.txt: %v\n", err)
		os.Exit(1)
	}

	sim := &Simulation{
		orders:        make(map[int]*Order),
		bots:          make(map[int]*Bot),
		nextOrderID:   1001,
		nextBotID:     1,
		pendingVIP:    make([]*Order, 0),
		pendingNormal: make([]*Order, 0),
		output:        output,
		orderCounter:  0,
	}

	sim.log("McDonald's Order Management System - Simulation Results")
	sim.log("")
	sim.log("[%s] System initialized with 0 bots", time.Now().Format("15:04:05"))
	
	return sim
}

func (s *Simulation) log(format string, args ...interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()
	fmt.Fprintf(s.output, format+"\n", args...)
	// Also print to stdout for interactive mode
	fmt.Printf(format+"\n", args...)
}

func (s *Simulation) addOrder(orderType OrderType) {
	s.mu.Lock()
	
	order := &Order{
		ID:        s.nextOrderID,
		Type:      orderType,
		Status:    PENDING,
		CreatedAt: time.Now(),
		Position:  s.orderCounter,
	}
	s.orderCounter++
	s.orders[order.ID] = order

	var logMsg string
	if orderType == VIP {
		s.pendingVIP = append(s.pendingVIP, order)
		logMsg = fmt.Sprintf("[%s] Created VIP Order #%d - Status: PENDING", 
			order.CreatedAt.Format("15:04:05"), order.ID)
	} else {
		s.pendingNormal = append(s.pendingNormal, order)
		logMsg = fmt.Sprintf("[%s] Created Normal Order #%d - Status: PENDING", 
			order.CreatedAt.Format("15:04:05"), order.ID)
	}

	s.nextOrderID++
	s.mu.Unlock()
	
	// Log outside of lock
	fmt.Println(logMsg)
	s.mu.Lock()
	fmt.Fprintln(s.output, logMsg)
	s.mu.Unlock()
	
	s.assignOrdersToIdleBots()
}

func (s *Simulation) addBot() {
	s.mu.Lock()
	
	bot := &Bot{
		ID:     s.nextBotID,
		Status: IDLE,
	}
	s.bots[bot.ID] = bot
	s.nextBotID++

	logMsg := fmt.Sprintf("[%s] Bot #%d created - Status: ACTIVE", 
		time.Now().Format("15:04:05"), bot.ID)
	
	s.mu.Unlock()
	
	// Log outside of lock
	fmt.Println(logMsg)
	s.mu.Lock()
	fmt.Fprintln(s.output, logMsg)
	s.mu.Unlock()
	
	s.assignOrdersToIdleBots()
}

func (s *Simulation) removeBot() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.bots) == 0 {
		logMsg := fmt.Sprintf("[%s] No bots to remove", time.Now().Format("15:04:05"))
		fmt.Println(logMsg)
		fmt.Fprintln(s.output, logMsg)
		return
	}

	// Find the newest bot
	var newestBot *Bot
	maxID := -1
	for _, bot := range s.bots {
		if bot.ID > maxID {
			maxID = bot.ID
			newestBot = bot
		}
	}

	if newestBot.Status == ACTIVE && newestBot.CurrentOrder != nil {
		// Return order to pending queue
		order := newestBot.CurrentOrder
		order.Status = PENDING
		order.StartedAt = time.Time{}
		
		// Reinsert order maintaining priority
		if order.Type == VIP {
			s.pendingVIP = append(s.pendingVIP, order)
			// Sort VIP orders by original position
			sort.Slice(s.pendingVIP, func(i, j int) bool {
				return s.pendingVIP[i].Position < s.pendingVIP[j].Position
			})
		} else {
			s.pendingNormal = append(s.pendingNormal, order)
			// Sort normal orders by original position
			sort.Slice(s.pendingNormal, func(i, j int) bool {
				return s.pendingNormal[i].Position < s.pendingNormal[j].Position
			})
		}
		
		logMsg := fmt.Sprintf("[%s] Bot #%d destroyed while processing Order #%d - Order returned to PENDING", 
			time.Now().Format("15:04:05"), newestBot.ID, order.ID)
		fmt.Println(logMsg)
		fmt.Fprintln(s.output, logMsg)
	} else {
		logMsg := fmt.Sprintf("[%s] Bot #%d destroyed while IDLE", 
			time.Now().Format("15:04:05"), newestBot.ID)
		fmt.Println(logMsg)
		fmt.Fprintln(s.output, logMsg)
	}

	delete(s.bots, newestBot.ID)
}

func (s *Simulation) assignOrdersToIdleBots() {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	for _, bot := range s.bots {
		if bot.Status == IDLE {
			s.assignOrderToBot(bot)
		}
	}
}

func (s *Simulation) assignOrderToBot(bot *Bot) {
	// s.mu is already locked by caller
	var nextOrder *Order
	
	// Priority: VIP first, then Normal
	if len(s.pendingVIP) > 0 {
		nextOrder = s.pendingVIP[0]
		s.pendingVIP = s.pendingVIP[1:]
	} else if len(s.pendingNormal) > 0 {
		nextOrder = s.pendingNormal[0]
		s.pendingNormal = s.pendingNormal[1:]
	} else {
		// No orders to process
		return
	}

	bot.Status = ACTIVE
	bot.CurrentOrder = nextOrder
	nextOrder.Status = PROCESSING
	nextOrder.StartedAt = time.Now()

	logMsg := fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING", 
		nextOrder.StartedAt.Format("15:04:05"), bot.ID, nextOrder.Type, nextOrder.ID)
	
	// Log outside of main lock to avoid deadlock
	fmt.Println(logMsg)
	fmt.Fprintln(s.output, logMsg)

	// Process order in background
	go s.processOrder(bot, nextOrder)
}

func (s *Simulation) processOrder(bot *Bot, order *Order) {
	// Simulate 10 seconds processing time
	time.Sleep(10 * time.Second)

	// Lock simulation to update state
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if bot still exists and has this order
	if _, exists := s.bots[bot.ID]; !exists || bot.CurrentOrder != order {
		return
	}

	order.Status = COMPLETE
	order.CompletedAt = time.Now()
	bot.CurrentOrder = nil
	
	logMsg := fmt.Sprintf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", 
		order.CompletedAt.Format("15:04:05"), bot.ID, order.Type, order.ID)
	
	// Log
	fmt.Println(logMsg)
	fmt.Fprintln(s.output, logMsg)

	// Check if there are more orders to process
	if len(s.pendingVIP) > 0 || len(s.pendingNormal) > 0 {
		bot.Status = IDLE
		s.assignOrderToBot(bot)
	} else {
		bot.Status = IDLE
		idleMsg := fmt.Sprintf("[%s] Bot #%d is now IDLE - No pending orders", 
			time.Now().Format("15:04:05"), bot.ID)
		fmt.Println(idleMsg)
		fmt.Fprintln(s.output, idleMsg)
	}
}

func (s *Simulation) printStatus() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	fmt.Println("")
	fmt.Println("Current Status:")
	fmt.Printf("- Total Orders: %d\n", len(s.orders))
	
	vipCount := 0
	normalCount := 0
	completedCount := 0
	
	for _, order := range s.orders {
		if order.Type == VIP {
			vipCount++
		} else {
			normalCount++
		}
		if order.Status == COMPLETE {
			completedCount++
		}
	}
	
	fmt.Printf("- VIP Orders: %d, Normal Orders: %d\n", vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", completedCount)
	fmt.Printf("- Active Bots: %d\n", len(s.bots))
	fmt.Printf("- Pending VIP Orders: %d\n", len(s.pendingVIP))
	fmt.Printf("- Pending Normal Orders: %d\n", len(s.pendingNormal))
	fmt.Println("")
}

func (s *Simulation) printFinalStatus() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	finalOutput := "\nFinal Status:\n"
	
	vipCount := 0
	normalCount := 0
	completedCount := 0
	
	for _, order := range s.orders {
		if order.Type == VIP {
			vipCount++
		} else {
			normalCount++
		}
		if order.Status == COMPLETE {
			completedCount++
		}
	}
	
	finalOutput += fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", 
		len(s.orders), vipCount, normalCount)
	finalOutput += fmt.Sprintf("- Orders Completed: %d\n", completedCount)
	finalOutput += fmt.Sprintf("- Active Bots: %d\n", len(s.bots))
	finalOutput += fmt.Sprintf("- Pending Orders: %d\n", len(s.pendingVIP)+len(s.pendingNormal))
	finalOutput += "\n"
	
	// Write to file and console
	fmt.Fprint(s.output, finalOutput)
	fmt.Print(finalOutput)
}

func (s *Simulation) Start() {
	defer s.output.Close()

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Println("McDonald's Order Management System - Interactive CLI")
	fmt.Println("Commands:")
	fmt.Println("  n - New Normal Order")
	fmt.Println("  v - New VIP Order")
	fmt.Println("  + - Add Bot")
	fmt.Println("  - - Remove Bot")
	fmt.Println("  s - Show Status")
	fmt.Println("  q - Quit")
	fmt.Println("")

	// For non-interactive mode (like in run.sh), process commands from stdin
	for scanner.Scan() {
		cmd := strings.TrimSpace(scanner.Text())
		if cmd == "" {
			continue
		}
		
		switch cmd {
		case "n":
			s.addOrder(NORMAL)
		case "v":
			s.addOrder(VIP)
		case "+":
			s.addBot()
		case "-":
			s.removeBot()
		case "s":
			s.printStatus()
		case "q":
			s.printFinalStatus()
			fmt.Println("\nSimulation ended. Results saved to result.txt")
			return
		default:
			fmt.Println("Unknown command. Available commands: n, v, +, -, s, q")
		}
		
		// Small sleep to allow goroutines to process
		time.Sleep(100 * time.Millisecond)
	}
}