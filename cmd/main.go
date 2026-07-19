package main

import (
	"bufio"
	"container/heap"
	"flag"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

const orderProcessSecs = 3

// Order represents a customer order
type Order struct {
	ID          int       `json:"id"`
	Type        string    `json:"type"`   // "VIP" or "Normal"
	Status      string    `json:"status"` // "PENDING", "PROCESSING", "COMPLETE"
	CreatedAt   time.Time `json:"createdAt"`
	CompletedAt time.Time `json:"completedAt,omitempty"`
}

// OrderQueue implements heap.Interface for priority queue
type OrderQueue []*Order

func (oq OrderQueue) Len() int { return len(oq) }

func (oq OrderQueue) Less(i, j int) bool {
	// VIP orders have higher priority
	if oq[i].Type == "VIP" && oq[j].Type != "VIP" {
		return true
	}
	if oq[i].Type != "VIP" && oq[j].Type == "VIP" {
		return false
	}
	// For same type, maintain order (FIFO)
	return oq[i].CreatedAt.Before(oq[j].CreatedAt)
}

func (oq OrderQueue) Swap(i, j int) {
	oq[i], oq[j] = oq[j], oq[i]
}

func (oq *OrderQueue) Push(x interface{}) {
	*oq = append(*oq, x.(*Order))
}

func (oq *OrderQueue) Pop() interface{} {
	old := *oq
	n := len(old)
	item := old[n-1]
	*oq = old[0 : n-1]
	return item
}

// Bot represents a cooking bot
type Bot struct {
	ID        int       `json:"id"`
	Status    string    `json:"status"` // "IDLE", "PROCESSING"
	OrderID   int       `json:"orderId,omitempty"`
	StartedAt time.Time `json:"startedAt,omitempty"`
	stopChan  chan bool
	wg        *sync.WaitGroup
}

// System represents the entire order management system
type System struct {
	mu           sync.RWMutex
	orders       map[int]*Order
	pendingQueue *OrderQueue
	completeList []*Order
	bots         []*Bot
	orderCounter int
	botCounter   int
	logMutex     sync.Mutex
	orderWg      sync.WaitGroup
	file         *os.File
	scanner      *bufio.Scanner
	interactive  bool
}

// NewSystem creates a new system instance
func NewSystem() *System {
	pq := &OrderQueue{}
	heap.Init(pq)

	return &System{
		orders:       make(map[int]*Order),
		pendingQueue: pq,
		completeList: []*Order{},
		bots:         []*Bot{},
		orderCounter: 0,
		botCounter:   0,
		interactive:  false,
	}
}

// log writes a message with timestamp
func (s *System) log(format string, args ...interface{}) {
	s.logMutex.Lock()
	defer s.logMutex.Unlock()
	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf(format, args...)
	output := fmt.Sprintf("[%s] %s", timestamp, message)

	if s.file != nil {
		fmt.Fprintln(s.file, output)
	}
	fmt.Println(output)
}

// AddOrder adds a new order to the system
func (s *System) AddOrder(orderType string) *Order {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.orderCounter++
	order := &Order{
		ID:        s.orderCounter,
		Type:      orderType,
		Status:    "PENDING",
		CreatedAt: time.Now(),
	}

	s.orders[order.ID] = order
	heap.Push(s.pendingQueue, order)

	s.orderWg.Add(1)
	s.log("Order #%d (%s) added to PENDING", order.ID, orderType)

	return order
}

// notifyIdleBots notifies all idle bots to check for pending orders
func (s *System) notifyIdleBots() {
	for _, bot := range s.bots {
		if bot.Status == "IDLE" {
			select {
			case bot.stopChan <- true:
			default:
			}
		}
	}
}

// AddBot adds a new bot to the system
func (s *System) AddBot() *Bot {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.botCounter++
	bot := &Bot{
		ID:       s.botCounter,
		Status:   "IDLE",
		stopChan: make(chan bool),
		wg:       &sync.WaitGroup{},
	}
	s.bots = append(s.bots, bot)

	s.log("Bot #%d created", bot.ID)

	// Start bot's processing loop
	bot.wg.Add(1)
	go s.processBot(bot)

	return bot
}

// RemoveBot removes the newest bot from the system
func (s *System) RemoveBot() bool {
	s.mu.Lock()

	if len(s.bots) == 0 {
		s.mu.Unlock()
		return false
	}

	// Remove the newest bot
	bot := s.bots[len(s.bots)-1]
	s.bots = s.bots[:len(s.bots)-1]

	s.log("Bot #%d removed", bot.ID)
	close(bot.stopChan)

	s.mu.Unlock()
	return true
}

func (s *System) isBotActive(bot *Bot) bool {
	for _, b := range s.bots {
		if b.ID == bot.ID {
			return true
		}
	}
	return false
}

// processBot handles the bot's lifecycle
func (s *System) processBot(bot *Bot) {
	defer bot.wg.Done()
	ticker := time.NewTicker(time.Millisecond * 500)

	for {
		select {
		case <-bot.stopChan:
			return
		case <-ticker.C:
			order := s.getNextOrder()
			if order == nil {
				continue
			}

			// Process the order
			s.mu.Lock()
			order.Status = "PROCESSING"
			bot.Status = "PROCESSING"
			bot.OrderID = order.ID
			bot.StartedAt = time.Now()
			s.mu.Unlock()

			s.log("Bot #%d started processing Order #%d", bot.ID, order.ID)

			select {
			case <-time.After(orderProcessSecs * time.Second):
				// Order complete
				s.mu.Lock()
				order.Status = "COMPLETE"
				order.CompletedAt = time.Now()
				s.completeList = append(s.completeList, order)
				bot.Status = "IDLE"
				bot.OrderID = 0
				s.mu.Unlock()

				s.log("Order #%d completed by Bot #%d", order.ID, bot.ID)
				s.orderWg.Done()

			case <-bot.stopChan:
				s.mu.Lock()
				// Return order to be pending
				if order.Status == "PROCESSING" {
					order.Status = "PENDING"
					heap.Push(s.pendingQueue, order)
					s.log("Order #%d returned to PENDING (bot removed during processing)", order.ID)
				}

				bot.Status = "IDLE"
				bot.OrderID = 0
				s.mu.Unlock()

				s.orderWg.Done()
				ticker.Stop()
				return
			}
		}
	}
}

// getNextOrder gets the next pending order (thread-safe)
func (s *System) getNextOrder() *Order {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.pendingQueue.Len() == 0 {
		return nil
	}

	return heap.Pop(s.pendingQueue).(*Order)
}

// GetPendingCount returns the number of pending orders
func (s *System) GetPendingCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.pendingQueue.Len()
}

// GetCompleteCount returns the number of completed orders
func (s *System) GetCompleteCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.completeList)
}

// GetBotCount returns the number of active bots
func (s *System) GetBotCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.bots)
}

// WaitForCompletion waits for all bots to finish and orders to complete
func (s *System) WaitForCompletion() {
	// Wait for all bots to finish their current tasks
	for _, bot := range s.bots {
		bot.wg.Wait()
	}
}

func (s *System) WaitForOrdersComplete() {
	s.orderWg.Wait() // 等待所有订单处理完成
}

// ShowStatus displays current system status
func (s *System) ShowStatus() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	fmt.Println("\n=== System Status ===")
	fmt.Printf("Total Orders: %d\n", s.orderCounter)
	fmt.Printf("Pending Orders: %d\n", s.pendingQueue.Len())
	fmt.Printf("Completed Orders: %d\n", len(s.completeList))
	fmt.Printf("Active Bots: %d\n", len(s.bots))
	fmt.Println()

	if s.pendingQueue.Len() > 0 {
		fmt.Println("Pending Orders:")
		for _, order := range *s.pendingQueue {
			status := "PENDING"
			if order.Status == "PROCESSING" {
				status = "PROCESSING"
			}
			fmt.Printf("  #%d [%s] %s\n", order.ID, order.Type, status)
		}
	}

	if len(s.completeList) > 0 {
		fmt.Println("\nCompleted Orders:")
		for _, order := range s.completeList {
			fmt.Printf("  #%d [%s] Completed at %s\n",
				order.ID, order.Type, order.CompletedAt.Format("15:04:05"))
		}
	}

	if len(s.bots) > 0 {
		fmt.Println("\nBots:")
		for _, bot := range s.bots {
			if bot.Status == "PROCESSING" {
				fmt.Printf("  Bot #%d: PROCESSING Order #%d\n", bot.ID, bot.OrderID)
			} else {
				fmt.Printf("  Bot #%d: IDLE\n", bot.ID)
			}
		}
	}
	fmt.Println()
}

// WriteSummary writes final summary to file
func (s *System) WriteSummary() {
	s.log("\n=== Final Summary ===")
	s.log("Total Orders Created: %d", s.orderCounter)
	s.log("Completed Orders: %d", s.GetCompleteCount())
	s.log("Pending Orders: %d", s.GetPendingCount())
	s.log("Active Bots: %d", s.GetBotCount())
}

// Close closes the log file
func (s *System) Close() error {
	if s.file != nil {
		return s.file.Close()
	}
	return nil
}

// printHelp displays available commands
func printHelp() {
	fmt.Println("\n=== Available Commands ===")
	fmt.Println("  new normal    - Add a new Normal order")
	fmt.Println("  new vip       - Add a new VIP order")
	fmt.Println("  add bot       - Add a new cooking bot")
	fmt.Println("  remove bot    - Remove the newest bot")
	fmt.Println("  status        - Show current system status")
	fmt.Println("  help          - Show this help message")
	fmt.Println("  quit          - Exit the program")
	fmt.Println()
}

// runInteractive runs the interactive mode
func runInteractive(system *System) {
	system.interactive = true

	fmt.Println("=== McDonald's Order System (Interactive Mode) ===")
	fmt.Println("Type 'help' for available commands")
	fmt.Println()

	// Start with 2 bots
	system.AddBot()
	system.AddBot()
	system.ShowStatus()

	scanner := bufio.NewScanner(os.Stdin)

	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}

		parts := strings.Fields(input)
		if len(parts) == 0 {
			continue
		}

		cmd := strings.ToLower(parts[0])

		switch cmd {
		case "new":
			if len(parts) < 2 {
				fmt.Println("Usage: new <normal|vip>")
				continue
			}
			orderType := strings.ToLower(parts[1])
			if orderType == "normal" {
				system.AddOrder("Normal")
			} else if orderType == "vip" {
				system.AddOrder("VIP")
			} else {
				fmt.Println("Invalid order type. Use 'normal' or 'vip'")
			}

		case "add":
			if len(parts) < 2 {
				fmt.Println("Usage: add bot")
				continue
			}
			if strings.ToLower(parts[1]) == "bot" {
				system.AddBot()
			} else {
				fmt.Println("Invalid command. Use 'add bot'")
			}

		case "remove":
			if len(parts) < 2 {
				fmt.Println("Usage: remove bot")
				continue
			}
			if strings.ToLower(parts[1]) == "bot" {
				system.RemoveBot()
			} else {
				fmt.Println("Invalid command. Use 'remove bot'")
			}

		case "status":
			system.ShowStatus()

		case "help":
			printHelp()

		case "quit", "exit":
			fmt.Println("Shutting down...")
			system.WriteSummary()
			return

		default:
			fmt.Printf("Unknown command: %s\n", cmd)
			fmt.Println("Type 'help' for available commands")
		}
	}

	system.WriteSummary()
}

// runAutoTest runs the automatic test mode
func runAutoTest(system *System) {
	system.interactive = false

	fmt.Println("=== McDonald's Order System (Auto Test Mode) ===")
	fmt.Println("Running automated test scenario...")
	fmt.Println()

	// Add initial bots
	system.AddBot()
	system.AddBot()

	// Scenario 1: Add normal orders
	system.AddOrder("Normal")
	system.AddOrder("Normal")
	system.AddOrder("Normal")

	// Wait a bit for processing to start
	//time.Sleep(2 * time.Second)

	// Scenario 2: Add VIP orders
	system.AddOrder("VIP")
	system.AddOrder("VIP")

	// Wait for processing
	//time.Sleep(3 * time.Second)

	// Scenario 3: Add more orders
	system.AddOrder("Normal")
	system.AddOrder("VIP")
	system.AddOrder("Normal")

	// Wait for processing
	//time.Sleep(15 * time.Second)

	// Scenario 4: Test bot removal
	system.RemoveBot()

	//time.Sleep(5 * time.Second)

	// Scenario 5: Add another bot
	system.AddBot()
	system.WaitForOrdersComplete()

	// Wait for all processing to complete
	//time.Sleep(30 * time.Second)

	// Print summary
	system.WriteSummary()
}

func main() {
	// 定义命令行参数
	var interactive bool
	var autoTest bool
	var help bool

	flag.BoolVar(&interactive, "i", false, "Run in interactive mode")
	flag.BoolVar(&interactive, "interactive", false, "Run in interactive mode")
	flag.BoolVar(&autoTest, "t", true, "Run auto test mode")
	flag.BoolVar(&autoTest, "test", true, "Run auto test mode")
	flag.BoolVar(&help, "h", false, "Show help")
	flag.BoolVar(&help, "help", false, "Show help")

	flag.Usage = func() {
		fmt.Println("McDonald's Order System - CLI Application")
		fmt.Println("\nUsage:")
		fmt.Println("  ./mcdonalds [options]")
		fmt.Println("\nOptions:")
		fmt.Println("  -i, --interactive    Run in interactive mode (default if no flags)")
		fmt.Println("  -t, --test           Run auto test mode")
		fmt.Println("  -h, --help           Show this help message")
		fmt.Println("\nExamples:")
		fmt.Println("  ./mcdonalds -i       # Run in interactive mode")
		fmt.Println("  ./mcdonalds -t       # Run auto test mode")
		fmt.Println("  ./mcdonalds          # Default: interactive mode")
		fmt.Println("\nInteractive Commands:")
		fmt.Println("  new normal    - Add a new Normal order")
		fmt.Println("  new vip       - Add a new VIP order")
		fmt.Println("  add bot       - Add a new cooking bot")
		fmt.Println("  remove bot    - Remove the newest bot")
		fmt.Println("  status        - Show current system status")
		fmt.Println("  help          - Show this help message")
		fmt.Println("  quit          - Exit the program")
	}

	flag.Parse()

	// 显示帮助
	if help {
		flag.Usage()
		return
	}

	// 创建系统实例
	system := NewSystem()
	defer system.Close()

	// 创建 result.txt
	file, err := os.Create("result.txt")
	if err != nil {
		fmt.Printf("Error creating result.txt: %v\n", err)
		return
	}
	system.file = file

	// 决定运行模式
	// 默认：如果没有指定任何参数，运行交互式模式
	// 如果指定了 -t 或 --test，运行测试模式
	// 如果指定了 -i 或 --interactive，运行交互式模式
	if autoTest {
		runAutoTest(system)
	} else {
		// 默认运行交互式模式（无论是否指定 -i）
		runInteractive(system)
	}
}
