package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Order 订单结构
type Order struct {
	ID        int    `json:"id"`
	Type      string `json:"type"` // "vip" or "normal"
	CreatedAt int64  `json:"createdAt"`
}

// OrderManager 管理器
type OrderManager struct {
	mu          sync.Mutex
	vipQueue    []*Order       // VIP 等待队列（头部优先）
	normalQueue []*Order       // 普通等待队列
	completed   []*Order       // 已完成订单
	processing  map[int]*Order // robot id -> 正在处理的订单
	nextOrderID int32          // 下一个订单ID（自增）
	nextRobotID int32
	robots      map[int]*Robot
	robotOrder  []int // 记录机器人创建顺序（用于移除最新的）
	cond        *sync.Cond
	resultFile  *os.File
}

// Robot 机器人
type Robot struct {
	ID      int
	cancel  chan struct{}
	done    chan struct{}
	manager *OrderManager
}

var manager *OrderManager

// 初始化
func init() {
	file, err := os.OpenFile("./result.txt", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		panic("Unable to create result.txt: " + err.Error())
	}
	manager = &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextOrderID: 0, // 改为 0，让第一个订单从 1 开始
		nextRobotID: 1,
		resultFile:  file,
	}
	manager.cond = sync.NewCond(&manager.mu)

	logEvent("McDonald's Order Management System - Simulation Results")
	logEvent("System initialized with %d bots", 0)
}

// 统一日志输出函数
func logEvent(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	timestamp := time.Now().Format("15:04:05")
	logLine := fmt.Sprintf("[%s] %s", timestamp, msg)
	fmt.Println(logLine)

	// 同时写入 result.txt
	if manager != nil && manager.resultFile != nil {
		manager.resultFile.WriteString(logLine + "\n")
		manager.resultFile.Sync()
	}
}

// 返回类型
func mapType(t string) string {
	if t == "vip" {
		return "VIP"
	}
	return "Normal"
}

// 新增订单，用于下面新增普通订单和VIP订单
func (m *OrderManager) addOrder(orderType string, queue *[]*Order) *Order {
	m.mu.Lock()
	defer m.mu.Unlock()

	order := &Order{
		ID:        int(atomic.AddInt32(&m.nextOrderID, 1)),
		Type:      orderType,
		CreatedAt: time.Now().UnixNano(),
	}
	*queue = append(*queue, order)

	orderDisplay := mapType(orderType)
	logEvent("Created %s Order #%d - Status: PENDING", orderDisplay, order.ID)
	m.cond.Signal()
	return order
}

// 添加普通订单
func (m *OrderManager) AddNormalOrder() *Order {
	return m.addOrder("normal", &m.normalQueue)
}

// 添加 VIP 订单
func (m *OrderManager) AddVipOrder() *Order {
	return m.addOrder("vip", &m.vipQueue)
}

// 机器人获取订单（阻塞）
func (m *OrderManager) GetOrder(robotID int, stop <-chan struct{}) *Order {
	m.mu.Lock()
	defer m.mu.Unlock()
	for {
		var order *Order
		if len(m.vipQueue) > 0 {
			order = m.vipQueue[0]
			m.vipQueue = m.vipQueue[1:]
		} else if len(m.normalQueue) > 0 {
			order = m.normalQueue[0]
			m.normalQueue = m.normalQueue[1:]
		}
		if order != nil {
			m.processing[robotID] = order
			orderType := mapType(order.Type)
			logEvent("Bot #%d picked up %s Order #%d - Status: PROCESSING", robotID, orderType, order.ID)
			return order
		}
		m.cond.Wait()
		select {
		case <-stop:
			return nil
		default:
		}
	}
}

// 完成订单
func (m *OrderManager) CompleteOrder(robotID int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	order, ok := m.processing[robotID]
	if !ok {
		return
	}
	delete(m.processing, robotID)
	m.completed = append(m.completed, order)
	orderType := mapType(order.Type)
	logEvent("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", robotID, orderType, order.ID)
	m.cond.Signal()
}

// 归还订单（机器人被移除时）
func (m *OrderManager) ReturnOrder(robotID int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	order, ok := m.processing[robotID]
	if !ok {
		return
	}
	delete(m.processing, robotID)
	if order.Type == "vip" {
		m.vipQueue = append([]*Order{order}, m.vipQueue...)
	} else {
		m.normalQueue = append([]*Order{order}, m.normalQueue...)
	}
	logEvent("Bot #%d removed while processing Order #%d - Status: RETURNED TO PENDING", robotID, order.ID)
	m.cond.Signal()
}

// 添加机器人
func (m *OrderManager) AddRobot() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := int(atomic.AddInt32(&m.nextRobotID, 1))
	robot := &Robot{
		ID:      id,
		cancel:  make(chan struct{}),
		done:    make(chan struct{}),
		manager: m,
	}
	m.robots[id] = robot
	m.robotOrder = append(m.robotOrder, id)
	go robot.run()
	logEvent("Bot #%d created - Status: ACTIVE", id)
	return id
}

// 移除最新机器人
func (m *OrderManager) RemoveRobot() bool {
	m.mu.Lock()
	if len(m.robotOrder) == 0 {
		m.mu.Unlock()
		logEvent("No bots available to remove")
		return false
	}
	lastID := m.robotOrder[len(m.robotOrder)-1]
	m.robotOrder = m.robotOrder[:len(m.robotOrder)-1]
	robot := m.robots[lastID]
	delete(m.robots, lastID)
	m.mu.Unlock()

	close(robot.cancel)
	// 广播唤醒可能正在等待的机器人
	m.mu.Lock()
	m.cond.Broadcast()
	m.mu.Unlock()

	<-robot.done
	logEvent("Robot #%d removed, remaining robots: %d\n", lastID, len(m.robots))
	return true
}

// 机器人运行逻辑
func (r *Robot) run() {
	defer close(r.done)
	for {
		order := r.manager.GetOrder(r.ID, r.cancel)
		if order == nil {
			return
		}
		select {
		case <-time.After(10 * time.Second):
			r.manager.CompleteOrder(r.ID)
		case <-r.cancel:
			r.manager.ReturnOrder(r.ID)
			return
		}
	}
}

// ========== HTTP 模式相关 ==========
type State struct {
	PendingOrders []*Order `json:"pendingOrders"`
	Completed     []*Order `json:"completed"`
	RobotCount    int      `json:"robotCount"`
	Processing    []int    `json:"processing"` // 正在处理的订单 ID
}

func (m *OrderManager) GetState() State {
	m.mu.Lock()
	defer m.mu.Unlock()
	pending := make([]*Order, 0, len(m.vipQueue)+len(m.normalQueue))
	pending = append(pending, m.vipQueue...)
	pending = append(pending, m.normalQueue...)
	processingIDs := make([]int, 0, len(m.processing))
	for _, o := range m.processing {
		processingIDs = append(processingIDs, o.ID)
	}
	return State{
		PendingOrders: pending,
		Completed:     m.completed,
		RobotCount:    len(m.robots),
		Processing:    processingIDs,
	}
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func handleNormalOrder(w http.ResponseWriter, r *http.Request) {
	order := manager.AddNormalOrder()
	json.NewEncoder(w).Encode(order)
}

func handleVipOrder(w http.ResponseWriter, r *http.Request) {
	order := manager.AddVipOrder()
	json.NewEncoder(w).Encode(order)
}

func handleAddBot(w http.ResponseWriter, r *http.Request) {
	id := manager.AddRobot()
	json.NewEncoder(w).Encode(map[string]int{"botId": id})
}

func handleRemoveBot(w http.ResponseWriter, r *http.Request) {
	ok := manager.RemoveRobot()
	json.NewEncoder(w).Encode(map[string]bool{"success": ok})
}

func handleState(w http.ResponseWriter, r *http.Request) {
	state := manager.GetState()
	json.NewEncoder(w).Encode(state)
}

func startHTTPServer() {
	http.HandleFunc("/api/order/normal", enableCORS(handleNormalOrder))
	http.HandleFunc("/api/order/vip", enableCORS(handleVipOrder))
	http.HandleFunc("/api/bot/add", enableCORS(handleAddBot))
	http.HandleFunc("/api/bot/remove", enableCORS(handleRemoveBot))
	http.HandleFunc("/api/state", enableCORS(handleState))
	logEvent("HTTP Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// ========== CLI 模式相关 ==========
func (m *OrderManager) printHelp() {
	fmt.Println("\n🍔 McDonald's order processing system CLI")
	fmt.Println("command list (support short):")
	fmt.Println("  new normal   / n normal(n)  - Add a normal order")
	fmt.Println("  new vip      / n vip(v)     - Add a vip order")
	fmt.Println("  add bot      / ab bot       - Add a bot")
	fmt.Println("  remove bot   / rb bot       - Remove a bot")
	fmt.Println("  list pending / l pending(p) - List pending orders")
	fmt.Println("  list done    / l done(d)    - List done orders")
	fmt.Println("  status       / s            - View system status")
	fmt.Println("  final        / f            - Show final status")
	fmt.Println("  help         / h            - Help")
	fmt.Println("  exit         / q            - Exit")
}

func (m *OrderManager) printFinalStatus() {
	manager.mu.Lock()
	defer manager.mu.Unlock()

	vipCount := 0
	normalCount := 0
	for _, o := range manager.completed {
		if o.Type == "vip" {
			vipCount++
		} else {
			normalCount++
		}
	}

	fmt.Println("\nFinal Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", len(manager.completed), vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", len(manager.completed))
	fmt.Printf("- Active Bots: %d\n", len(manager.robots))
	fmt.Printf("- Pending Orders: %d\n", len(manager.vipQueue)+len(manager.normalQueue))
	fmt.Println()
}

func (m *OrderManager) printStatus() {
	m.mu.Lock()
	defer m.mu.Unlock()
	fmt.Println("\n========== system status ==========")
	fmt.Printf("number of robots: %d\n", len(m.robots))
	fmt.Printf("Pending VIP orders: %d, normal orders: %d\n", len(m.vipQueue), len(m.normalQueue))
	fmt.Printf("Total number of done orders: %d\n", len(m.completed))
	if len(m.processing) > 0 {
		fmt.Print("Orders in process: ")
		for _, o := range m.processing {
			fmt.Printf("%d ", o.ID)
		}
		fmt.Println()
	}
	fmt.Println("==============================")
}

func (m *OrderManager) listPending() {
	m.mu.Lock()
	defer m.mu.Unlock()
	fmt.Println("\n[Pending orders]")
	if len(m.vipQueue) == 0 && len(m.normalQueue) == 0 {
		fmt.Println("  nothing")
	} else {
		for _, o := range m.vipQueue {
			fmt.Printf("  VIP   %d\n", o.ID)
		}
		for _, o := range m.normalQueue {
			fmt.Printf("  Normal  %d\n", o.ID)
		}
	}
}

func (m *OrderManager) listCompleted() {
	m.mu.Lock()
	defer m.mu.Unlock()
	fmt.Println("\n[done orders]")
	if len(m.completed) == 0 {
		fmt.Println("  nothing")
	} else {
		for _, o := range m.completed {
			fmt.Printf("  %s %d\n", mapType(o.Type), o.ID)
		}
	}
}

func startCLI() {
	// 默认启动一个机器人（便于演示）
	manager.AddRobot()
	manager.printHelp()
	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) == 0 {
			continue
		}
		cmd := parts[0]
		switch cmd {
		case "new", "n":
			if len(parts) < 2 {
				fmt.Println("Usage: new normal|vip")
				continue
			}
			switch parts[1] {
			case "normal", "n":
				manager.AddNormalOrder()
			case "vip", "v":
				manager.AddVipOrder()
			default:
				fmt.Println("Unknown order type, please use normal or vip")
			}
		case "add", "ab":
			if len(parts) > 1 && parts[1] == "bot" {
				manager.AddRobot()
			} else {
				fmt.Println("Usage: add bot")
			}
		case "remove", "rb":
			if len(parts) > 1 && parts[1] == "bot" {
				manager.RemoveRobot()
			} else {
				fmt.Println("Usage: remove bot")
			}
		case "list", "l":
			if len(parts) < 2 {
				fmt.Println("Usage: list pending|done")
				continue
			}
			switch parts[1] {
			case "pending", "p":
				manager.listPending()
			case "done", "d":
				manager.listCompleted()
			default:
				fmt.Println("Unknown list, use pending or done")
			}
		case "status", "s":
			manager.printStatus()
		case "final", "f":
			manager.printFinalStatus()
		case "help", "h":
			manager.printHelp()
		case "exit", "q":
			manager.printFinalStatus()
			fmt.Println("Goodbye!")
			return
		default:
			fmt.Println("Unknown command. Type help to view help")
		}
	}
}

// ========== 主函数 ==========
func main() {
	cliMode := flag.Bool("cli", false, "Start CLI interactive mode (default: start HTTP server)")
	flag.Parse()
	defer manager.resultFile.Close()
	if *cliMode {
		startCLI()
	} else {
		startHTTPServer()
	}
}
