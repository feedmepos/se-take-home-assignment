# 麦当劳订单控制器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Go CLI 订单控制器：VIP 优先队列、可增减 Bot、可配置处理时长、交互 + demo 双模式，并通过 GitHub Actions 检查。

**Architecture:** `OrderController` 用 mutex + `sync.Cond` 管理 PENDING/COMPLETE 与 Bot 池；每个 Bot 一个 goroutine，处理中可被 context 取消并按优先级回队。CLI 层负责命令解析、时间戳日志、demo 编排。

**Tech Stack:** Go 1.23+、标准库（`sync`、`context`、`time`、`bufio`、`flag`）、shell 脚本对接 CI。

## Global Constraints

- 语言：Go（Golang），模块路径 `github.com/Splinglove/se-take-home-assignment`
- 无持久化：全部内存
- 默认处理时长：`10s`；可通过 `-process-time` 覆盖
- 日志时间戳格式：`HH:MM:SS`（即 `15:04:05`）
- 脚本目录：`scripts/`（`test.sh` / `build.sh` / `run.sh` / `result.txt`）
- Spec 与 Plan 文档正文用中文；模型字段、术语、样例代码用英文
- YAGNI：不做前端、不做 HTTP API、不引入第三方依赖

## 文件结构

| 路径 | 职责 |
|------|------|
| `go.mod` | Go module |
| `internal/order/order.go` | Order 模型与类型/状态常量 |
| `internal/order/queue.go` | PENDING 插队纯函数（便于单测） |
| `internal/order/queue_test.go` | VIP/普通插队测试 |
| `internal/bot/bot.go` | Bot 模型与状态常量 |
| `internal/controller/controller.go` | 调度核心：下单、加减 Bot、快照 |
| `internal/controller/controller_test.go` | 控制器行为单测 |
| `internal/cli/cli.go` | 交互循环、命令分发、日志 |
| `internal/cli/demo.go` | `-demo` 场景编排 |
| `cmd/order-controller/main.go` | 入口：flag → interactive / demo |
| `scripts/test.sh` / `build.sh` / `run.sh` | CI 脚本 |
| `README.md` | 补充用法（简短） |

---

### Task 1: Go module + Order 模型与队列插队

**Files:**
- Create: `go.mod`
- Create: `internal/order/order.go`
- Create: `internal/order/queue.go`
- Create: `internal/order/queue_test.go`

**Interfaces:**
- Consumes: 无
- Produces:
  - `type Type string` — `TypeNormal`, `TypeVIP`
  - `type Status string` — `StatusPending`, `StatusProcessing`, `StatusComplete`
  - `type Order struct { ID int; Type Type; Status Status }`
  - `func InsertPending(pending []*Order, o *Order) []*Order`

- [ ] **Step 1: 初始化 module**

```bash
cd /Users/chenenqi/workself/se-take-home-assignment
go mod init github.com/Splinglove/se-take-home-assignment
```

Expected: 生成 `go.mod`，`go` 版本 ≥ 1.23。

- [ ] **Step 2: 写失败的插队测试**

Create `internal/order/queue_test.go`:

```go
package order_test

import (
	"testing"

	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

func ids(orders []*order.Order) []int {
	out := make([]int, len(orders))
	for i, o := range orders {
		out[i] = o.ID
	}
	return out
}

func TestInsertPending_VIPBehindVIPsAheadOfNormals(t *testing.T) {
	var pending []*order.Order
	pending = order.InsertPending(pending, &order.Order{ID: 1, Type: order.TypeNormal, Status: order.StatusPending})
	pending = order.InsertPending(pending, &order.Order{ID: 2, Type: order.TypeVIP, Status: order.StatusPending})
	pending = order.InsertPending(pending, &order.Order{ID: 3, Type: order.TypeNormal, Status: order.StatusPending})
	pending = order.InsertPending(pending, &order.Order{ID: 4, Type: order.TypeVIP, Status: order.StatusPending})

	got := ids(pending)
	want := []int{2, 4, 1, 3}
	if len(got) != len(want) {
		t.Fatalf("len=%d want %d; got=%v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("order mismatch: got %v want %v", got, want)
		}
	}
}

func TestInsertPending_NormalAppendsToTail(t *testing.T) {
	pending := []*order.Order{
		{ID: 1, Type: order.TypeVIP, Status: order.StatusPending},
		{ID: 2, Type: order.TypeNormal, Status: order.StatusPending},
	}
	pending = order.InsertPending(pending, &order.Order{ID: 3, Type: order.TypeNormal, Status: order.StatusPending})
	got := ids(pending)
	want := []int{1, 2, 3}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v want %v", got, want)
		}
	}
}
```

- [ ] **Step 3: 跑测试确认失败**

Run: `go test ./internal/order/ -v`

Expected: FAIL（`InsertPending` 未定义或包不存在）

- [ ] **Step 4: 实现 Order 与 InsertPending**

Create `internal/order/order.go`:

```go
package order

type Type string

const (
	TypeNormal Type = "NORMAL"
	TypeVIP    Type = "VIP"
)

type Status string

const (
	StatusPending    Status = "PENDING"
	StatusProcessing Status = "PROCESSING"
	StatusComplete   Status = "COMPLETE"
)

type Order struct {
	ID     int
	Type   Type
	Status Status
}
```

Create `internal/order/queue.go`:

```go
package order

// InsertPending inserts o into pending by VIP-before-Normal rules.
// VIP: after all existing VIPs, before first Normal.
// Normal: append to tail.
func InsertPending(pending []*Order, o *Order) []*Order {
	if o.Type == TypeNormal {
		return append(pending, o)
	}
	idx := 0
	for idx < len(pending) && pending[idx].Type == TypeVIP {
		idx++
	}
	pending = append(pending, nil)
	copy(pending[idx+1:], pending[idx:])
	pending[idx] = o
	return pending
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `go test ./internal/order/ -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add go.mod internal/order/
git commit -m "feat: add order model and VIP pending queue insert"
```

---

### Task 2: Bot 模型 + Controller 下单与快照（尚无 Bot 调度）

**Files:**
- Create: `internal/bot/bot.go`
- Create: `internal/controller/controller.go`
- Create: `internal/controller/controller_test.go`

**Interfaces:**
- Consumes: `order.Order`, `order.InsertPending`, `order.Type*`, `order.Status*`
- Produces:
  - `bot.StatusIdle`, `bot.StatusProcessing`
  - `bot.Bot struct { ID int; Status Status; CurrentOrder *order.Order }`
  - `controller.New(processTime time.Duration, logFn func(string)) *Controller`
  - `(*Controller) CreateNormalOrder() *order.Order`
  - `(*Controller) CreateVIPOrder() *order.Order`
  - `(*Controller) Snapshot() Snapshot`
  - `type Snapshot struct { Pending, Complete []*order.Order; Bots []*bot.Bot }`

- [ ] **Step 1: 写失败的下单 / ID / 队列测试**

Create `internal/controller/controller_test.go`:

```go
package controller_test

import (
	"testing"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/controller"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

func TestCreateOrders_IncreasingIDsAndVIPPriority(t *testing.T) {
	c := controller.New(50*time.Millisecond, func(string) {})
	o1 := c.CreateNormalOrder()
	o2 := c.CreateVIPOrder()
	o3 := c.CreateNormalOrder()

	if o1.ID != 1 || o2.ID != 2 || o3.ID != 3 {
		t.Fatalf("ids got %d,%d,%d want 1,2,3", o1.ID, o2.ID, o3.ID)
	}

	snap := c.Snapshot()
	if len(snap.Pending) != 3 {
		t.Fatalf("pending len=%d", len(snap.Pending))
	}
	want := []int{2, 1, 3}
	for i, id := range want {
		if snap.Pending[i].ID != id {
			t.Fatalf("pending order: got %v want %v",
				[]int{snap.Pending[0].ID, snap.Pending[1].ID, snap.Pending[2].ID}, want)
		}
		if snap.Pending[i].Status != order.StatusPending {
			t.Fatalf("order %d status=%s", snap.Pending[i].ID, snap.Pending[i].Status)
		}
	}
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `go test ./internal/controller/ -v`

Expected: FAIL（包/类型未定义）

- [ ] **Step 3: 实现 bot 与最小 Controller**

Create `internal/bot/bot.go`:

```go
package bot

import "github.com/Splinglove/se-take-home-assignment/internal/order"

type Status string

const (
	StatusIdle       Status = "IDLE"
	StatusProcessing Status = "PROCESSING"
)

type Bot struct {
	ID           int
	Status       Status
	CurrentOrder *order.Order
}
```

Create `internal/controller/controller.go`（本 Task 仅实现下单与 Snapshot；Bot 方法可先返回错误或空实现，下一 Task 补全）:

```go
package controller

import (
	"fmt"
	"sync"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/bot"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

type Snapshot struct {
	Pending  []*order.Order
	Complete []*order.Order
	Bots     []*bot.Bot
}

type botHandle struct {
	bot    *bot.Bot
	cancel contextCancel
}

// contextCancel avoids importing context in the type alias section; real code uses context.CancelFunc.
type contextCancel func()

type Controller struct {
	mu          sync.Mutex
	cond        *sync.Cond
	processTime time.Duration
	log         func(string)
	nextOrderID int
	nextBotID   int
	pending     []*order.Order
	complete    []*order.Order
	bots        []*botHandle
}

func New(processTime time.Duration, logFn func(string)) *Controller {
	if logFn == nil {
		logFn = func(string) {}
	}
	c := &Controller{
		processTime: processTime,
		log:         logFn,
		nextOrderID: 1,
		nextBotID:   1,
	}
	c.cond = sync.NewCond(&c.mu)
	return c
}

func (c *Controller) CreateNormalOrder() *order.Order {
	return c.createOrder(order.TypeNormal)
}

func (c *Controller) CreateVIPOrder() *order.Order {
	return c.createOrder(order.TypeVIP)
}

func (c *Controller) createOrder(t order.Type) *order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	o := &order.Order{
		ID:     c.nextOrderID,
		Type:   t,
		Status: order.StatusPending,
	}
	c.nextOrderID++
	c.pending = order.InsertPending(c.pending, o)
	c.log(fmt.Sprintf("Created %s Order #%d - Status: PENDING", t, o.ID))
	c.cond.Broadcast()
	return o
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	pending := append([]*order.Order(nil), c.pending...)
	complete := append([]*order.Order(nil), c.complete...)
	bots := make([]*bot.Bot, 0, len(c.bots))
	for _, h := range c.bots {
		cp := *h.bot
		bots = append(bots, &cp)
	}
	return Snapshot{Pending: pending, Complete: complete, Bots: bots}
}
```

注意：实现时请直接使用 `context.CancelFunc`，不要保留上面的 `contextCancel` 别名；完整签名：

```go
import "context"

type botHandle struct {
	bot    *bot.Bot
	cancel context.CancelFunc
	ctx    context.Context
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `go test ./internal/controller/ -v`

Expected: `TestCreateOrders_IncreasingIDsAndVIPPriority` PASS

- [ ] **Step 5: Commit**

```bash
git add internal/bot/ internal/controller/
git commit -m "feat: add bot model and controller order creation"
```

---

### Task 3: Controller 加减 Bot、处理、中断回队

**Files:**
- Modify: `internal/controller/controller.go`
- Modify: `internal/controller/controller_test.go`

**Interfaces:**
- Consumes: Task 2 的 `Controller`
- Produces:
  - `(*Controller) AddBot() *bot.Bot`
  - `(*Controller) RemoveBot() (*bot.Bot, bool)` — 无 Bot 时返回 `(nil, false)`
  - 内部：`runBot(h *botHandle)` goroutine（测试用轮询 `Snapshot`，不强制 `WaitIdle`）

- [ ] **Step 1: 追加失败测试**

在 `controller_test.go` 的 import 中增加：

```go
"github.com/Splinglove/se-take-home-assignment/internal/bot"
```

然后追加：

```go
func TestAddBot_PicksPendingAndCompletes(t *testing.T) {
	c := controller.New(30*time.Millisecond, func(string) {})
	c.CreateVIPOrder()
	c.CreateNormalOrder()
	c.AddBot()

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snap := c.Snapshot()
		if len(snap.Complete) == 2 && len(snap.Pending) == 0 {
			if snap.Complete[0].ID != 1 || snap.Complete[1].ID != 2 {
				t.Fatalf("complete order: got [%d,%d] want [1,2]", snap.Complete[0].ID, snap.Complete[1].ID)
			}
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("timeout waiting for completions")
}

func TestRemoveBot_RequeuesProcessingOrderWithPriority(t *testing.T) {
	c := controller.New(2*time.Second, func(string) {})
	n := c.CreateNormalOrder()
	_ = n
	c.AddBot()

	// wait until processing starts
	deadline := time.Now().Add(200 * time.Millisecond)
	for time.Now().Before(deadline) {
		snap := c.Snapshot()
		if len(snap.Bots) == 1 && snap.Bots[0].Status == bot.StatusProcessing {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}

	c.CreateVIPOrder() // VIP while normal is processing / will be requeued
	removed, ok := c.RemoveBot()
	if !ok || removed == nil {
		t.Fatal("expected bot removed")
	}

	snap := c.Snapshot()
	if len(snap.Bots) != 0 {
		t.Fatalf("bots=%d want 0", len(snap.Bots))
	}
	if len(snap.Pending) != 2 {
		t.Fatalf("pending=%d want 2: %+v", len(snap.Pending), snap.Pending)
	}
	// VIP should be ahead of requeued Normal
	if snap.Pending[0].Type != order.TypeVIP || snap.Pending[1].Type != order.TypeNormal {
		t.Fatalf("priority broken: %s then %s", snap.Pending[0].Type, snap.Pending[1].Type)
	}
	if snap.Pending[0].Status != order.StatusPending || snap.Pending[1].Status != order.StatusPending {
		t.Fatal("requeued orders must be PENDING")
	}
}

func TestIdleBot_WakesOnNewOrder(t *testing.T) {
	c := controller.New(20*time.Millisecond, func(string) {})
	c.AddBot()
	time.Sleep(30 * time.Millisecond) // bot becomes idle
	c.CreateNormalOrder()

	deadline := time.Now().Add(300 * time.Millisecond)
	for time.Now().Before(deadline) {
		if len(c.Snapshot().Complete) == 1 {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("idle bot did not process new order")
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `go test ./internal/controller/ -v`

Expected: 新测试 FAIL（`AddBot` 未定义）

- [ ] **Step 3: 实现 AddBot / RemoveBot / runBot**

在 `controller.go` 追加（保持与现有字段一致）：

```go
import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/bot"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

func (c *Controller) AddBot() *bot.Bot {
	c.mu.Lock()
	b := &bot.Bot{ID: c.nextBotID, Status: bot.StatusIdle}
	c.nextBotID++
	ctx, cancel := context.WithCancel(context.Background())
	h := &botHandle{bot: b, cancel: cancel, ctx: ctx}
	c.bots = append(c.bots, h)
	c.log(fmt.Sprintf("Bot #%d created - Status: ACTIVE", b.ID))
	c.mu.Unlock()
	go c.runBot(h)
	return b
}

func (c *Controller) RemoveBot() (*bot.Bot, bool) {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return nil, false
	}
	last := len(c.bots) - 1
	h := c.bots[last]
	c.bots = c.bots[:last]
	c.mu.Unlock()

	h.cancel()
	// Allow runBot to observe cancel and requeue under lock.
	// runBot is responsible for clearing CurrentOrder / status.
	c.mu.Lock()
	c.cond.Broadcast()
	c.mu.Unlock()

	c.log(fmt.Sprintf("Bot #%d destroyed", h.bot.ID))
	return h.bot, true
}

func (c *Controller) runBot(h *botHandle) {
	for {
		c.mu.Lock()
		for len(c.pending) == 0 && h.ctx.Err() == nil {
			h.bot.Status = bot.StatusIdle
			h.bot.CurrentOrder = nil
			c.cond.Wait()
		}
		if h.ctx.Err() != nil {
			c.requeueIfNeededLocked(h)
			c.mu.Unlock()
			return
		}
		o := c.pending[0]
		c.pending = c.pending[1:]
		o.Status = order.StatusProcessing
		h.bot.Status = bot.StatusProcessing
		h.bot.CurrentOrder = o
		pt := c.processTime
		c.log(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", h.bot.ID, o.Type, o.ID))
		c.mu.Unlock()

		timer := time.NewTimer(pt)
		select {
		case <-timer.C:
			c.mu.Lock()
			if h.ctx.Err() != nil {
				// destroyed during/after timer — treat as cancel
				c.requeueOrderLocked(o)
				h.bot.Status = bot.StatusIdle
				h.bot.CurrentOrder = nil
				c.mu.Unlock()
				return
			}
			o.Status = order.StatusComplete
			c.complete = append(c.complete, o)
			h.bot.Status = bot.StatusIdle
			h.bot.CurrentOrder = nil
			c.log(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE", h.bot.ID, o.Type, o.ID))
			c.mu.Unlock()
		case <-h.ctx.Done():
			timer.Stop()
			c.mu.Lock()
			c.requeueOrderLocked(o)
			h.bot.Status = bot.StatusIdle
			h.bot.CurrentOrder = nil
			c.mu.Unlock()
			return
		}
	}
}

func (c *Controller) requeueIfNeededLocked(h *botHandle) {
	if h.bot.CurrentOrder != nil && h.bot.CurrentOrder.Status == order.StatusProcessing {
		c.requeueOrderLocked(h.bot.CurrentOrder)
	}
	h.bot.CurrentOrder = nil
	h.bot.Status = bot.StatusIdle
}

func (c *Controller) requeueOrderLocked(o *order.Order) {
	o.Status = order.StatusPending
	c.pending = order.InsertPending(c.pending, o)
	c.log(fmt.Sprintf("Order #%d returned to PENDING", o.ID))
}
```

实现细节注意：
- `RemoveBot` 与 `runBot` 的竞态：取消后必须由 `runBot` 的 `ctx.Done()` 分支回队；避免双重回队（回队前检查 `Status == PROCESSING`，或用“是否已完成”标志）。
- `cond.Wait()` 必须在持有 `c.mu` 时调用；被唤醒后重新检查条件。
- 销毁时若 bot 在 `Wait`，`Broadcast` 可让其退出。

- [ ] **Step 4: 跑测试确认通过**

Run: `go test ./internal/controller/ -v`

Expected: 全部 PASS

若 `TestRemoveBot_*` 偶发失败，收紧竞态处理后再跑几次确认稳定。

- [ ] **Step 5: Commit**

```bash
git add internal/controller/
git commit -m "feat: add bot workers with cancel and requeue"
```

---

### Task 4: CLI 交互层（命令 + 时间戳日志）

**Files:**
- Create: `internal/cli/cli.go`
- Create: `internal/cli/cli_test.go`
- Create: `cmd/order-controller/main.go`（可先只支持交互）

**Interfaces:**
- Consumes: `controller.New`, Create*/AddBot/RemoveBot/Snapshot
- Produces:
  - `cli.New(c *controller.Controller, in io.Reader, out io.Writer) *CLI`
  - `(*CLI) RunInteractive() error`
  - `cli.FormatLog(now time.Time, msg string) string` — `"[15:04:05] msg"`
  - `(*CLI) HandleLine(line string) (quit bool)`

- [ ] **Step 1: 写失败测试（日志格式 + 命令解析）**

```go
package cli_test

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/cli"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

func TestFormatLog_HHMMSS(t *testing.T) {
	ts := time.Date(2026, 7, 29, 14, 32, 1, 0, time.UTC)
	got := cli.FormatLog(ts, "System ready")
	want := "[14:32:01] System ready"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestHandleLine_NewOrdersAndStatus(t *testing.T) {
	var buf bytes.Buffer
	c := controller.New(time.Hour, func(msg string) {
		buf.WriteString(cli.FormatLog(time.Now(), msg) + "\n")
	})
	app := cli.New(c, strings.NewReader(""), &buf)
	app.HandleLine("n")
	app.HandleLine("v")
	app.HandleLine("s")
	out := buf.String()
	if !strings.Contains(out, "Order #1") || !strings.Contains(out, "Order #2") {
		t.Fatalf("missing order logs: %s", out)
	}
	if !strings.Contains(out, "PENDING") {
		t.Fatalf("status missing PENDING: %s", out)
	}
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `go test ./internal/cli/ -v`

Expected: FAIL

- [ ] **Step 3: 实现 CLI**

Create `internal/cli/cli.go`:

```go
package cli

import (
	"bufio"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

type CLI struct {
	ctrl *controller.Controller
	in   io.Reader
	out  io.Writer
}

func New(ctrl *controller.Controller, in io.Reader, out io.Writer) *CLI {
	return &CLI{ctrl: ctrl, in: in, out: out}
}

func FormatLog(now time.Time, msg string) string {
	return fmt.Sprintf("[%s] %s", now.Format("15:04:05"), msg)
}

func (c *CLI) log(msg string) {
	fmt.Fprintln(c.out, FormatLog(time.Now(), msg))
}

func (c *CLI) RunInteractive() error {
	fmt.Fprintln(c.out, "McDonald's Order Controller")
	fmt.Fprintln(c.out, "Commands: n/v/+/- /s/q")
	sc := bufio.NewScanner(c.in)
	fmt.Fprint(c.out, "> ")
	for sc.Scan() {
		if quit := c.HandleLine(sc.Text()); quit {
			return nil
		}
		fmt.Fprint(c.out, "> ")
	}
	return sc.Err()
}

func (c *CLI) HandleLine(line string) bool {
	cmd := strings.TrimSpace(strings.ToLower(line))
	switch cmd {
	case "n", "new normal":
		c.ctrl.CreateNormalOrder()
	case "v", "new vip":
		c.ctrl.CreateVIPOrder()
	case "+", "+bot":
		c.ctrl.AddBot()
	case "-", "-bot":
		if _, ok := c.ctrl.RemoveBot(); !ok {
			c.log("No bots to remove")
		}
	case "s", "status":
		c.printStatus()
	case "q", "quit":
		c.log("Bye")
		return true
	case "":
		// ignore
	default:
		c.log("Unknown command: " + line)
	}
	return false
}

func (c *CLI) printStatus() {
	snap := c.ctrl.Snapshot()
	fmt.Fprintf(c.out, "PENDING (%d):\n", len(snap.Pending))
	for _, o := range snap.Pending {
		fmt.Fprintf(c.out, "  #%d %s\n", o.ID, o.Type)
	}
	fmt.Fprintf(c.out, "COMPLETE (%d):\n", len(snap.Complete))
	for _, o := range snap.Complete {
		fmt.Fprintf(c.out, "  #%d %s\n", o.ID, o.Type)
	}
	fmt.Fprintf(c.out, "BOTS (%d):\n", len(snap.Bots))
	for _, b := range snap.Bots {
		cur := "none"
		if b.CurrentOrder != nil {
			cur = fmt.Sprintf("#%d", b.CurrentOrder.ID)
		}
		fmt.Fprintf(c.out, "  Bot #%d %s order=%s\n", b.ID, b.Status, cur)
	}
}
```

Controller 的 `log` 回调应写入带时间戳的行。在 `main` / `cli.New` 组装时：

```go
out := os.Stdout
ctrl := controller.New(processTime, func(msg string) {
	fmt.Fprintln(out, cli.FormatLog(time.Now(), msg))
})
```

- [ ] **Step 4: 写 main 入口（交互默认）**

Create `cmd/order-controller/main.go`:

```go
package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/cli"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

func main() {
	demo := flag.Bool("demo", false, "run non-interactive demo")
	processTime := flag.Duration("process-time", 10*time.Second, "order processing duration")
	flag.Parse()

	ctrl := controller.New(*processTime, func(msg string) {
		fmt.Fprintln(os.Stdout, cli.FormatLog(time.Now(), msg))
	})
	app := cli.New(ctrl, os.Stdin, os.Stdout)

	if *demo {
		if err := app.RunDemo(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if err := app.RunInteractive(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
```

本 Task 可先让 `RunDemo` 返回 `fmt.Errorf("not implemented")`，下一 Task 实现；或本 Task 只在非 demo 路径编译通过——若 `main` 引用了 `RunDemo`，则 Task 4 末尾必须提供 stub：

```go
func (c *CLI) RunDemo() error {
	return fmt.Errorf("demo not implemented")
}
```

- [ ] **Step 5: 跑测试**

Run: `go test ./internal/cli/ -v && go build -o bin/order-controller ./cmd/order-controller`

Expected: 测试 PASS，编译成功

- [ ] **Step 6: Commit**

```bash
git add internal/cli/ cmd/order-controller/
git commit -m "feat: add interactive CLI with timestamped logs"
```

---

### Task 5: Demo 模式

**Files:**
- Modify: `internal/cli/demo.go`（新建）
- Modify: `internal/cli/cli.go`（若 stub 在 cli.go，删 stub）

**Interfaces:**
- Consumes: CLI + Controller
- Produces: `(*CLI) RunDemo() error` — 编排场景并打印最终汇总

- [ ] **Step 1: 实现 RunDemo**

Create `internal/cli/demo.go`:

```go
package cli

import (
	"fmt"
	"time"
)

func (c *CLI) RunDemo() error {
	c.log("System initialized with 0 bots")

	c.ctrl.CreateNormalOrder()
	c.ctrl.CreateVIPOrder()
	c.ctrl.CreateNormalOrder()
	c.printStatus()

	c.ctrl.AddBot()
	c.ctrl.AddBot()

	// Wait until first three orders likely completing path progresses
	waitUntil(func() bool {
		s := c.ctrl.Snapshot()
		return len(s.Complete) >= 2
	}, 3*time.Second)

	c.ctrl.CreateVIPOrder()

	waitUntil(func() bool {
		s := c.ctrl.Snapshot()
		return len(s.Complete) == 4 && len(s.Pending) == 0
	}, 3*time.Second)

	c.ctrl.RemoveBot()

	// Ensure remaining work finishes and one bot left
	waitUntil(func() bool {
		s := c.ctrl.Snapshot()
		return len(s.Pending) == 0 && len(s.Complete) == 4 && len(s.Bots) == 1
	}, 2*time.Second)

	snap := c.ctrl.Snapshot()
	fmt.Fprintln(c.out, "")
	fmt.Fprintln(c.out, "Final Status:")
	fmt.Fprintf(c.out, "- Orders Completed: %d\n", len(snap.Complete))
	fmt.Fprintf(c.out, "- Active Bots: %d\n", len(snap.Bots))
	fmt.Fprintf(c.out, "- Pending Orders: %d\n", len(snap.Pending))
	return nil
}

func waitUntil(cond func() bool, timeout time.Duration) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
}
```

按需微调等待条件，确保 `-process-time=100ms` 时稳定跑完。日志中需出现多个 `[HH:MM:SS]`。

- [ ] **Step 2: 手动跑 demo**

```bash
go build -o bin/order-controller ./cmd/order-controller
./bin/order-controller -demo -process-time=100ms
```

Expected: stdout 含时间戳、订单完成、Final Status；进程退出码 0。

- [ ] **Step 3: Commit**

```bash
git add internal/cli/
git commit -m "feat: add demo mode for CI simulation"
```

---

### Task 6: Scripts、README、端到端验证

**Files:**
- Modify: `scripts/test.sh`
- Modify: `scripts/build.sh`
- Modify: `scripts/run.sh`
- Modify: `README.md`（简短补充用法）
- Generate: `scripts/result.txt`（由 `run.sh` 生成，可提交最新样例）

- [ ] **Step 1: 更新脚本**

`scripts/test.sh`:

```bash
#!/bin/bash
set -euo pipefail
echo "Running unit tests..."
go test ./... -v
echo "Unit tests completed"
```

`scripts/build.sh`:

```bash
#!/bin/bash
set -euo pipefail
echo "Building CLI application..."
mkdir -p bin
go build -o bin/order-controller ./cmd/order-controller
echo "Build completed"
```

`scripts/run.sh`:

```bash
#!/bin/bash
set -euo pipefail
echo "Running CLI application..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
"$ROOT_DIR/bin/order-controller" -demo -process-time=100ms > "$SCRIPT_DIR/result.txt"
echo "CLI application execution completed"
```

- [ ] **Step 2: 本地模拟 CI**

```bash
chmod +x scripts/test.sh scripts/build.sh scripts/run.sh
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
# verify timestamps
grep -E '[0-9]{2}:[0-9]{2}:[0-9]{2}' scripts/result.txt
```

Expected: 三脚本成功；`result.txt` 非空且含时间戳。

- [ ] **Step 3: README 补充用法（中文简述）**

在现有 README 末尾追加：

```markdown
### Backend (Go) — 本仓库实现

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh   # 写入 scripts/result.txt

# 交互模式
./bin/order-controller
# 或自定义处理时长
./bin/order-controller -process-time=10s
```

设计文档：`docs/superpowers/specs/2026-07-29-order-controller-design.md`
```

- [ ] **Step 4: Commit**

```bash
git add scripts/ README.md
git commit -m "chore: wire CI scripts and document CLI usage"
```

---

### Task 7: 功能分支与 Pull Request

**Files:** 无新代码（git / gh 操作）

- [ ] **Step 1: 确保在功能分支**

若当前仍在 `main`，将实现提交挪到分支（实现过程中应尽早建分支）：

```bash
git checkout -b feat/order-controller-cli
```

若提交已在 `main`，可用：

```bash
git branch feat/order-controller-cli
git checkout feat/order-controller-cli
```

（推送前不要强推 `main`；PR 从功能分支指向上游/本 fork 的 `main`。）

- [ ] **Step 2: Push 并创建 PR**

```bash
git push -u origin HEAD
gh pr create --title "feat: McDonald's order controller CLI (Go)" --body "$(cat <<'EOF'
## Summary
- Go CLI 订单控制器：VIP 优先队列、可增减 Bot、可配置处理时长
- 支持交互模式与 `-demo`（CI 用）
- `scripts/{test,build,run}.sh` 产出带 `HH:MM:SS` 的 `result.txt`

## Test plan
- [ ] `./scripts/test.sh` 全部通过
- [ ] `./scripts/build.sh && ./scripts/run.sh`
- [ ] `scripts/result.txt` 非空且含时间戳
- [ ] GitHub Action `backend-verify-result` 绿色
- [ ] 手动 `./bin/order-controller` 验证 n/v/+/-/s/q

EOF
)"
```

- [ ] **Step 3: 确认 Actions 通过**

```bash
gh pr checks
```

Expected: `backend-verify-result` success。

---

## Spec 覆盖自检

| Spec 要求 | Task |
|-----------|------|
| 普通/VIP → PENDING | Task 2 |
| VIP 插队 | Task 1–2 |
| 订单号唯一递增 | Task 2 |
| +Bot 取单、10s（可配）完成 → COMPLETE | Task 3、flag |
| 无单时 IDLE，有单唤醒 | Task 3 |
| -Bot 销毁最新；处理中回队保优先级 | Task 3 |
| 交互 CLI | Task 4 |
| demo + result.txt 时间戳 | Task 5–6 |
| scripts + Actions PR | Task 6–7 |

无 TBD / 占位步骤。类型名在各 Task 间一致：`CreateNormalOrder` / `CreateVIPOrder` / `AddBot` / `RemoveBot` / `Snapshot` / `RunDemo` / `FormatLog`。
