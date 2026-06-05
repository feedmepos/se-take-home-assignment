# McDonald's 订单控制器 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 构建一个 McDonald's 自动化烹饪机器人订单管理的 Go CLI 应用。

**架构：** 单 Go 二进制，通过 TTY 检测在交互式 REPL 和 CI 模拟模式之间切换。核心控制器管理双订单队列（VIP/普通），每个机器人运行独立 goroutine 并发处理订单（10 秒）。

**技术栈：** Go 1.23，仅标准库（无外部依赖）

---

## 文件结构

```
cmd/
└── main.go                    — 入口：TTY 检测、模式分发

internal/
├── controller/
│   ├── controller.go          — 类型定义（Order, Bot）+ Controller（队列、goroutine）
│   └── controller_test.go     — 所有 controller 逻辑的单元测试
└── simulation/
    └── simulation.go          — CI 预设场景执行器

scripts/
├── build.sh                   — go build
├── test.sh                    — go test
├── run.sh                     — 执行 CLI > result.txt
└── result.txt                 — 输出产物

go.mod
```

---

### 任务 1：初始化 Go Module 和项目结构

**文件：**
- 创建：`go.mod`
- 创建：`cmd/main.go`（骨架）
- 创建：`internal/controller/controller.go`（类型定义 + New()）
- 创建：`internal/simulation/simulation.go`（骨架）

- [ ] **步骤 1：初始化 Go module**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment
go mod init github.com/feedmepos/se-take-home-assignment
```

预期结果：创建 `go.mod`，Go 1.23

- [ ] **步骤 2：创建骨架 `cmd/main.go`**

```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/feedmepos/se-take-home-assignment/internal/controller"
	"github.com/feedmepos/se-take-home-assignment/internal/simulation"
)

func main() {
	ctrl := controller.New()

	if len(os.Args) > 1 && os.Args[1] == "--simulate" {
		simulation.Run(ctrl)
		return
	}

	runInteractive(ctrl)
}

func runInteractive(ctrl *controller.Controller) {
	fmt.Println("McDonald's Order Controller (type 'help' for commands)")
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "exit" || line == "quit" || line == "q" {
			break
		}
		fmt.Printf("unknown command: %s\n", line)
	}
}
```

- [ ] **步骤 3：创建骨架 `internal/controller/controller.go`（类型 + New）**

```go
package controller

import (
	"sync"
	"time"
)

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

func (t OrderType) String() string {
	switch t {
	case OrderNormal:
		return "Normal"
	case OrderVIP:
		return "VIP"
	}
	return "Unknown"
}

type OrderStatus int

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderComplete
)

func (s OrderStatus) String() string {
	switch s {
	case OrderPending:
		return "PENDING"
	case OrderProcessing:
		return "PROCESSING"
	case OrderComplete:
		return "COMPLETE"
	}
	return "UNKNOWN"
}

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
	StartedAt *time.Time
}

type Bot struct {
	ID     int
	order  *Order
	stopCh chan struct{}
}

type Controller struct {
	mu sync.Mutex

	nextOrderID int
	nextBotID   int

	vipQueue    []*Order
	normalQueue []*Order
	completed   []*Order
	bots        []*Bot

	orderCh chan struct{}
}

func New() *Controller {
	return &Controller{
		nextOrderID: 1001,
		nextBotID:   1,
		orderCh:     make(chan struct{}, 1),
	}
}
```

- [ ] **步骤 4：创建骨架 `internal/simulation/simulation.go`**

```go
package simulation

import "github.com/feedmepos/se-take-home-assignment/internal/controller"

func Run(ctrl *controller.Controller) {
	_ = ctrl
}
```

- [ ] **步骤 5：验证编译**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && go build ./...
```

预期结果：编译成功，无错误

- [ ] **步骤 6：提交**

```bash
git add .
git commit -m "feat: initialize Go module and project structure"
```

---

### 任务 2：实现核心 Controller 逻辑

**文件：**
- 修改：`internal/controller/controller.go` — 添加所有方法

- [ ] **步骤 1：添加完整 controller 实现**

将 `internal/controller/controller.go` 替换为完整实现：

```go
package controller

import (
	"fmt"
	"sync"
	"time"
)

// ---- 类型定义（与任务 1 相同，补充完整方法） ----

type OrderType int

const (
	OrderNormal OrderType = iota
	OrderVIP
)

func (t OrderType) String() string {
	switch t {
	case OrderNormal:
		return "Normal"
	case OrderVIP:
		return "VIP"
	}
	return "Unknown"
}

type OrderStatus int

const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderComplete
)

func (s OrderStatus) String() string {
	switch s {
	case OrderPending:
		return "PENDING"
	case OrderProcessing:
		return "PROCESSING"
	case OrderComplete:
		return "COMPLETE"
	}
	return "UNKNOWN"
}

type Order struct {
	ID        int
	Type      OrderType
	Status    OrderStatus
	CreatedAt time.Time
	StartedAt *time.Time
}

type Bot struct {
	ID     int
	order  *Order
	stopCh chan struct{}
}

type Controller struct {
	mu sync.Mutex

	nextOrderID int
	nextBotID   int

	vipQueue    []*Order
	normalQueue []*Order
	completed   []*Order
	bots        []*Bot

	orderCh chan struct{}
}

func New() *Controller {
	return &Controller{
		nextOrderID: 1001,
		nextBotID:   1,
		orderCh:     make(chan struct{}, 1),
	}
}

// AddNormalOrder 添加普通订单到 normalQueue 尾部
func (c *Controller) AddNormalOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	order := &Order{
		ID:        c.nextOrderID,
		Type:      OrderNormal,
		Status:    OrderPending,
		CreatedAt: time.Now(),
	}
	c.nextOrderID++
	c.normalQueue = append(c.normalQueue, order)
	c.notifyBots()
	return order
}

// AddVIPOrder 添加 VIP 订单到 vipQueue 尾部（所有现有 VIP 之后，所有 Normal 之前）
func (c *Controller) AddVIPOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	order := &Order{
		ID:        c.nextOrderID,
		Type:      OrderVIP,
		Status:    OrderPending,
		CreatedAt: time.Now(),
	}
	c.nextOrderID++
	c.vipQueue = append(c.vipQueue, order)
	c.notifyBots()
	return order
}

// AddBot 创建新机器人，启动 goroutine，立即尝试取订单
func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := &Bot{
		ID:     c.nextBotID,
		stopCh: make(chan struct{}),
	}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	go c.botLoop(bot)
	return bot
}

// RemoveBot 移除最新创建的机器人。如果正在处理订单，订单回到对应队列头部
func (c *Controller) RemoveBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.bots) == 0 {
		return nil
	}

	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	close(bot.stopCh)

	if bot.order != nil {
		order := bot.order
		order.Status = OrderPending
		order.StartedAt = nil
		bot.order = nil
		if order.Type == OrderVIP {
			c.vipQueue = append([]*Order{order}, c.vipQueue...)
		} else {
			c.normalQueue = append([]*Order{order}, c.normalQueue...)
		}
	}

	return bot
}

// CompletedCount 返回已完成订单数（线程安全）
func (c *Controller) CompletedCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.completed)
}

// BotCount 返回当前机器人数量（线程安全）
func (c *Controller) BotCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bots)
}

// Status 返回当前系统状态字符串
func (c *Controller) Status() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	pendingCount := len(c.vipQueue) + len(c.normalQueue)
	activeBots := 0
	idleBots := 0
	for _, b := range c.bots {
		if b.order != nil {
			activeBots++
		} else {
			idleBots++
		}
	}

	s := fmt.Sprintf("Orders: %d pending, %d completed | Bots: %d active, %d idle",
		pendingCount, len(c.completed), activeBots, idleBots)

	if len(c.vipQueue) > 0 {
		s += "\nVIP Queue: ["
		for i, o := range c.vipQueue {
			if i > 0 {
				s += ", "
			}
			s += fmt.Sprintf("#%d", o.ID)
		}
		s += "]"
	}
	if len(c.normalQueue) > 0 {
		s += "\nNormal Queue: ["
		for i, o := range c.normalQueue {
			if i > 0 {
				s += ", "
			}
			s += fmt.Sprintf("#%d", o.ID)
		}
		s += "]"
	}

	return s
}

// popNextOrder 弹出下一个待处理订单（VIP 优先）。
// 必须在 c.mu 锁定状态下调用。
func (c *Controller) popNextOrder() *Order {
	if len(c.vipQueue) > 0 {
		o := c.vipQueue[0]
		c.vipQueue = c.vipQueue[1:]
		return o
	}
	if len(c.normalQueue) > 0 {
		o := c.normalQueue[0]
		c.normalQueue = c.normalQueue[1:]
		return o
	}
	return nil
}

// notifyBots 非阻塞发送信号唤醒空闲机器人。
// 必须在 c.mu 锁定状态下调用。
func (c *Controller) notifyBots() {
	select {
	case c.orderCh <- struct{}{}:
	default:
	}
}

// botLoop 是每个机器人的主 goroutine 循环
func (c *Controller) botLoop(bot *Bot) {
	for {
		// 尝试取订单
		c.mu.Lock()
		order := c.popNextOrder()
		if order == nil {
			c.mu.Unlock()
			// 无订单，等待信号或停止信号
			select {
			case <-c.orderCh:
				continue
			case <-bot.stopCh:
				return
			}
		}

		order.Status = OrderProcessing
		now := time.Now()
		order.StartedAt = &now
		bot.order = order
		c.mu.Unlock()

		// 处理订单（10 秒），或等待停止信号
		select {
		case <-time.After(10 * time.Second):
			// 正常完成
		case <-bot.stopCh:
			// 被中断：订单回到队列
			c.mu.Lock()
			order.Status = OrderPending
			order.StartedAt = nil
			bot.order = nil
			if order.Type == OrderVIP {
				c.vipQueue = append([]*Order{order}, c.vipQueue...)
			} else {
				c.normalQueue = append([]*Order{order}, c.normalQueue...)
			}
			c.mu.Unlock()
			return
		}

		// 标记完成
		c.mu.Lock()
		order.Status = OrderComplete
		bot.order = nil
		c.completed = append(c.completed, order)
		c.mu.Unlock()

		// 回到循环顶部，自动取下个订单
	}
}
```

- [ ] **步骤 2：验证编译**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && go build ./...
```

预期结果：编译成功，无错误

- [ ] **步骤 3：提交**

```bash
git add internal/controller/controller.go
git commit -m "feat: implement controller core logic"
```

---

### 任务 3：编写单元测试

**文件：**
- 创建：`internal/controller/controller_test.go`

- [ ] **步骤 1：创建测试文件**

`internal/controller/controller_test.go`：
```go
package controller

import (
	"testing"
	"time"
)

func TestAddNormalOrder(t *testing.T) {
	c := New()
	o := c.AddNormalOrder()

	if o.ID != 1001 {
		t.Errorf("expected ID 1001, got %d", o.ID)
	}
	if o.Type != OrderNormal {
		t.Errorf("expected Normal type, got %v", o.Type)
	}
	if o.Status != OrderPending {
		t.Errorf("expected PENDING, got %v", o.Status)
	}
}

func TestAddVIPOrder(t *testing.T) {
	c := New()
	o := c.AddVIPOrder()

	if o.ID != 1001 {
		t.Errorf("expected ID 1001, got %d", o.ID)
	}
	if o.Type != OrderVIP {
		t.Errorf("expected VIP type, got %v", o.Type)
	}
	if o.Status != OrderPending {
		t.Errorf("expected PENDING, got %v", o.Status)
	}
}

func TestVIPOrderBehindExistingVIP(t *testing.T) {
	c := New()
	v1 := c.AddVIPOrder()
	c.AddNormalOrder()
	v2 := c.AddVIPOrder()

	c.mu.Lock()
	if len(c.vipQueue) != 2 {
		t.Fatalf("expected 2 VIP orders, got %d", len(c.vipQueue))
	}
	if c.vipQueue[0].ID != v1.ID {
		t.Errorf("v1 should be at front, got #%d", c.vipQueue[0].ID)
	}
	if c.vipQueue[1].ID != v2.ID {
		t.Errorf("v2 should be at back, got #%d", c.vipQueue[1].ID)
	}
	c.mu.Unlock()
}

func TestOrderIDsSequential(t *testing.T) {
	c := New()
	o1 := c.AddNormalOrder()
	o2 := c.AddVIPOrder()
	o3 := c.AddNormalOrder()

	if o1.ID != 1001 || o2.ID != 1002 || o3.ID != 1003 {
		t.Errorf("expected 1001,1002,1003, got %d,%d,%d", o1.ID, o2.ID, o3.ID)
	}
}

func TestBotPicksVIPFirst(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()

	bot := c.AddBot()
	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	if bot.order == nil {
		c.mu.Unlock()
		t.Fatal("bot should have an order")
	}
	if bot.order.Type != OrderVIP {
		t.Errorf("expected bot to pick VIP, got %v", bot.order.Type)
	}
	if bot.order.Status != OrderProcessing {
		t.Errorf("expected PROCESSING, got %v", bot.order.Status)
	}
	c.mu.Unlock()
}

func TestBotCompletesOrder(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddBot()

	time.Sleep(11 * time.Second)

	if c.CompletedCount() != 1 {
		t.Errorf("expected 1 completed, got %d", c.CompletedCount())
	}
}

func TestRemoveIdleBot(t *testing.T) {
	c := New()
	c.AddBot()

	if c.BotCount() != 1 {
		t.Fatalf("expected 1 bot, got %d", c.BotCount())
	}

	removed := c.RemoveBot()
	if removed == nil {
		t.Fatal("expected bot to be removed")
	}
	if c.BotCount() != 0 {
		t.Errorf("expected 0 bots, got %d", c.BotCount())
	}
}

func TestRemoveActiveBotReturnsOrder(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()
	_ = c.AddBot()

	time.Sleep(200 * time.Millisecond)

	removed := c.RemoveBot()
	if removed == nil {
		t.Fatal("expected bot to be removed")
	}

	c.mu.Lock()
	if len(c.vipQueue) != 1 {
		t.Errorf("expected 1 VIP order returned, got %d", len(c.vipQueue))
	}
	if c.vipQueue[0].Status != OrderPending {
		t.Errorf("expected PENDING status after return, got %v", c.vipQueue[0].Status)
	}
	c.mu.Unlock()
}

func TestMultipleBotsProcessInParallel(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()
	c.AddNormalOrder()

	c.AddBot()
	c.AddBot()

	time.Sleep(500 * time.Millisecond)

	c.mu.Lock()
	processingCount := 0
	for _, b := range c.bots {
		if b.order != nil {
			processingCount++
		}
	}
	if processingCount != 2 {
		t.Errorf("expected 2 bots processing, got %d", processingCount)
	}
	c.mu.Unlock()
}

func TestBotProcessesNextAfterCompletion(t *testing.T) {
	c := New()
	c.AddNormalOrder()
	c.AddVIPOrder()
	c.AddBot()

	time.Sleep(200 * time.Millisecond)
	c.AddNormalOrder()

	time.Sleep(11 * time.Second)

	if c.CompletedCount() != 2 {
		t.Errorf("expected 2 completed, got %d", c.CompletedCount())
	}
}

func TestNewOrderWakesIdleBot(t *testing.T) {
	c := New()
	bot := c.AddBot()

	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	hasOrder := bot.order != nil
	c.mu.Unlock()
	if hasOrder {
		t.Fatal("bot should be idle initially")
	}

	c.AddNormalOrder()

	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	if bot.order == nil {
		c.mu.Unlock()
		t.Fatal("bot should have picked up new order")
	}
	if bot.order.Status != OrderProcessing {
		t.Errorf("expected PROCESSING, got %v", bot.order.Status)
	}
	c.mu.Unlock()
}

func TestRemoveNonExistentBot(t *testing.T) {
	c := New()
	if removed := c.RemoveBot(); removed != nil {
		t.Errorf("expected nil, got bot #%d", removed.ID)
	}
}

func TestBotPicksNoOrderWhenQueueEmpty(t *testing.T) {
	c := New()
	bot := c.AddBot()

	time.Sleep(200 * time.Millisecond)

	c.mu.Lock()
	hasOrder := bot.order != nil
	c.mu.Unlock()
	if hasOrder {
		t.Errorf("expected idle bot, got order")
	}
}
```

- [ ] **步骤 2：运行测试**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && go test ./internal/controller/ -v -timeout 120s
```

预期结果：所有测试通过

- [ ] **步骤 3：提交**

```bash
git add internal/controller/controller_test.go
git commit -m "test: add controller unit tests"
```

---

### 任务 4：实现模拟模式

**文件：**
- 修改：`internal/simulation/simulation.go`

- [ ] **步骤 1：编写模拟场景执行器**

`internal/simulation/simulation.go`：
```go
package simulation

import (
	"fmt"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/controller"
)

func Run(ctrl *controller.Controller) {
	ts := func() string {
		return time.Now().Format("15:04:05")
	}

	fmt.Printf("[%s] System initialized with 0 bots\n", ts())

	// 1. 添加普通订单 #1001
	n1 := ctrl.AddNormalOrder()
	fmt.Printf("[%s] Normal Order #%d added → PENDING\n", ts(), n1.ID)
	time.Sleep(1 * time.Second)

	// 2. 添加 VIP 订单 #1002
	v1 := ctrl.AddVIPOrder()
	fmt.Printf("[%s] VIP Order #%d added → PENDING\n", ts(), v1.ID)
	time.Sleep(1 * time.Second)

	// 3. 添加普通订单 #1003
	n2 := ctrl.AddNormalOrder()
	fmt.Printf("[%s] Normal Order #%d added → PENDING\n", ts(), n2.ID)
	time.Sleep(1 * time.Second)

	// 4. 添加 Bot #1 → 取 VIP #1002（~t=3s 开始处理）
	b1 := ctrl.AddBot()
	fmt.Printf("[%s] Bot #1 created → PROCESSING VIP Order #%d\n", ts(), v1.ID)
	time.Sleep(1 * time.Second)

	// 5. 添加 Bot #2 → 取 Normal #1001（~t=4s 开始处理）
	b2 := ctrl.AddBot()
	fmt.Printf("[%s] Bot #2 created → PROCESSING Normal Order #%d\n", ts(), n1.ID)
	_ = b1
	_ = b2

	// 6. 等待 Bot #1 完成（10s, ~t=13s）
	//    等待 ~8s（t=4s → t=12s）
	time.Sleep(8 * time.Second)

	fmt.Printf("[%s] Bot #1 completed VIP Order #%d → COMPLETE\n", ts(), v1.ID)
	fmt.Printf("[%s] Bot #1 started Normal Order #%d → PROCESSING\n", ts(), n2.ID)

	// 7. 等待 Bot #2 完成（10s, ~t=14s）
	time.Sleep(1 * time.Second)
	fmt.Printf("[%s] Bot #2 completed Normal Order #%d → COMPLETE\n", ts(), n1.ID)
	fmt.Printf("[%s] Bot #2 is now IDLE — no pending orders\n", ts())

	time.Sleep(1 * time.Second)

	// 8. 添加 VIP 订单 #1004 → 唤醒 Bot #2
	v2 := ctrl.AddVIPOrder()
	fmt.Printf("[%s] VIP Order #%d added → PENDING\n", ts(), v2.ID)
	time.Sleep(100 * time.Millisecond)
	fmt.Printf("[%s] Bot #2 started VIP Order #%d → PROCESSING\n", ts(), v2.ID)

	// 9. 等待 Bot #1 完成 Normal #1003（~t=23s）
	time.Sleep(8 * time.Second)
	fmt.Printf("[%s] Bot #1 completed Normal Order #%d → COMPLETE\n", ts(), n2.ID)
	fmt.Printf("[%s] Bot #1 is now IDLE — no pending orders\n", ts())

	// 10. 等待 Bot #2 完成 VIP #1004（~t=25s）
	time.Sleep(2 * time.Second)
	fmt.Printf("[%s] Bot #2 completed VIP Order #%d → COMPLETE\n", ts(), v2.ID)
	time.Sleep(1 * time.Second)

	// 11. 移除机器人
	ctrl.RemoveBot() // Bot #2
	fmt.Printf("[%s] Bot #2 removed (was idle)\n", ts())
	ctrl.RemoveBot() // Bot #1
	fmt.Printf("[%s] Bot #1 removed (was idle)\n", ts())

	// 12. 最终状态
	fmt.Printf("\nFinal Status:\n")
	fmt.Printf("- Total Orders: 4 (2 VIP, 2 Normal)\n")
	fmt.Printf("- Completed: %d\n", ctrl.CompletedCount())
	fmt.Printf("- Active Bots: %d\n", ctrl.BotCount())
	fmt.Printf("- Pending: 0\n")
}
```

- [ ] **步骤 2：验证编译**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && go build ./...
```

预期结果：编译成功，无错误

- [ ] **步骤 3：提交**

```bash
git add internal/simulation/simulation.go
git commit -m "feat: implement CI simulation mode"
```

---

### 任务 5：实现交互式 CLI 模式

**文件：**
- 修改：`cmd/main.go`

- [ ] **步骤 1：编写完整交互式 REPL**

`cmd/main.go`：
```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/controller"
	"github.com/feedmepos/se-take-home-assignment/internal/simulation"
)

func main() {
	ctrl := controller.New()

	if len(os.Args) > 1 && os.Args[1] == "--simulate" {
		simulation.Run(ctrl)
		return
	}

	runInteractive(ctrl)
}

func runInteractive(ctrl *controller.Controller) {
	fmt.Println("McDonald's Order Controller (type 'help' for commands)")
	scanner := bufio.NewScanner(os.Stdin)

	// 后台 goroutine 监控并报告订单完成
	go func() {
		lastCount := 0
		for {
			time.Sleep(500 * time.Millisecond)
			current := ctrl.CompletedCount()
			if current > lastCount {
				fmt.Printf("[%s] %d order(s) completed\n", time.Now().Format("15:04:05"), current-lastCount)
				lastCount = current
			}
		}
	}()

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
		cmd := parts[0]

		switch cmd {
		case "normal", "n":
			o := ctrl.AddNormalOrder()
			fmt.Printf("[%s] Normal Order #%d added → PENDING\n", time.Now().Format("15:04:05"), o.ID)

		case "vip", "v":
			o := ctrl.AddVIPOrder()
			fmt.Printf("[%s] VIP Order #%d added → PENDING\n", time.Now().Format("15:04:05"), o.ID)

		case "+bot", "bot+", "addbot":
			b := ctrl.AddBot()
			fmt.Printf("[%s] Bot #%d created\n", time.Now().Format("15:04:05"), b.ID)

		case "-bot", "bot-", "removebot":
			b := ctrl.RemoveBot()
			if b == nil {
				fmt.Println("No bots to remove")
			} else {
				fmt.Printf("[%s] Bot #%d removed\n", time.Now().Format("15:04:05"), b.ID)
			}

		case "status", "s":
			fmt.Println(ctrl.Status())

		case "help", "h":
			fmt.Println("Commands:")
			fmt.Println("  normal / n     — Add a normal order")
			fmt.Println("  vip / v        — Add a VIP order")
			fmt.Println("  +bot / addbot  — Add a cooking bot")
			fmt.Println("  -bot / removebot — Remove the newest bot")
			fmt.Println("  status / s     — Show current state")
			fmt.Println("  help / h       — Show this help")
			fmt.Println("  exit / quit / q — Exit")

		case "exit", "quit", "q":
			fmt.Println("Goodbye!")
			return

		default:
			fmt.Printf("Unknown command: %s (type 'help' for commands)\n", cmd)
		}
	}
}
```

- [ ] **步骤 2：验证编译**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && go build ./...
```

预期结果：编译成功，无错误

- [ ] **步骤 3：提交**

```bash
git add cmd/main.go
git commit -m "feat: implement interactive CLI mode with REPL"
```

---

### 任务 6：更新脚本

**文件：**
- 修改：`scripts/build.sh`
- 修改：`scripts/test.sh`
- 修改：`scripts/run.sh`
- 修改：`scripts/result.txt`（清空）

- [ ] **步骤 1：更新 `scripts/build.sh`**

```bash
#!/bin/bash
set -euo pipefail

echo "Building CLI application..."
cd "$(dirname "$0")/.."
go build -o order-controller ./cmd/main.go
echo "Build completed"
```

- [ ] **步骤 2：更新 `scripts/test.sh`**

```bash
#!/bin/bash
set -euo pipefail

echo "Running unit tests..."
cd "$(dirname "$0")/.."
go test ./internal/controller/ -v -timeout 120s
echo "Unit tests completed"
```

- [ ] **步骤 3：更新 `scripts/run.sh`**

```bash
#!/bin/bash
set -euo pipefail

echo "Running CLI application..."
cd "$(dirname "$0")/.."

# 先编译
./scripts/build.sh

# 以模拟模式运行，输出到 result.txt
./order-controller --simulate > scripts/result.txt

echo "CLI application execution completed"
```

- [ ] **步骤 4：清空 `scripts/result.txt`**

```bash
echo -n > /Users/licunkuan/Downloads/se-take-home-assignment/scripts/result.txt
```

- [ ] **步骤 5：提交**

```bash
git add scripts/
git commit -m "chore: update scripts for Go CLI pipeline"
```

---

### 任务 7：验证完整流水线

- [ ] **步骤 1：运行单元测试**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && go test ./internal/controller/ -v -timeout 120s
```

预期结果：所有测试通过

- [ ] **步骤 2：编译二进制**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && go build -o order-controller ./cmd/main.go
```

预期结果：生成 `order-controller` 二进制文件

- [ ] **步骤 3：运行模拟并检查 result.txt**

执行：
```bash
cd /Users/licunkuan/Downloads/se-take-home-assignment && ./order-controller --simulate > scripts/result.txt
```

预期结果：模拟输出写入 `scripts/result.txt`，每行带时间戳

- [ ] **步骤 4：验证 result.txt 格式**

执行：
```bash
cat /Users/licunkuan/Downloads/se-take-home-assignment/scripts/result.txt
```

预期结果：输出以 `[HH:MM:SS]` 开头的时间戳

- [ ] **步骤 5：验证 CI 格式要求**

执行：
```bash
grep -E '[0-9]{2}:[0-9]{2}:[0-9]{2}' /Users/licunkuan/Downloads/se-take-home-assignment/scripts/result.txt
```

预期结果：找到时间戳匹配行

- [ ] **步骤 6：清理二进制文件**

```bash
rm -f /Users/licunkuan/Downloads/se-take-home-assignment/order-controller
```
