# Order Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement task-by-task.

**Goal:** Go CLI for McDonald's order controller with VIP prioritization and bot pool simulation.

**Tech Stack:** Go 1.23+, cobra, container/heap

---

### Task 1: Go Module + Directory Structure

- [ ] **Init module and install cobra**

```bash
go mod init foundation-cli
go get github.com/spf13/cobra@latest
mkdir -p cmd/foundation-cli
mkdir -p internal/business/order
mkdir -p internal/platform/output
mkdir -p tests/unit/business/order
git add go.mod go.sum
git commit -m "chore: init Go module with cobra"
```

---

### Task 2: Domain Models — models.go

- [ ] **Create internal/business/order/models.go**

```go
package order

import "time"

type OrderType int
const (
	OrderNormal OrderType = iota
	OrderVIP
)

type OrderStatus int
const (
	OrderPending OrderStatus = iota
	OrderProcessing
	OrderCompleted
)

type Order struct {
	ID                uint64
	Type              OrderType
	Status            OrderStatus
	ProcessingStarted time.Time
}

type BotStatus int
const (
	BotIdle BotStatus = iota
	BotBusy
)

type Bot struct {
	ID     uint64
	Status BotStatus
	Order  *Order
}

type Event struct {
	Timestamp time.Time
	Message   string
}
```

- [ ] **Commit**

```bash
git add internal/business/order/models.go
git commit -m "feat: core domain types"
```

---

### Task 3: Priority Queue — queue.go + test

- [ ] **Write test at tests/unit/business/order/queue_test.go**

```go
package order_test

import (
	"testing"
	"foundation-cli/internal/business/order"
)

func TestQueue_VIPBeforeNormal(t *testing.T) {
	q := order.NewQueue()
	q.Push(&order.Order{ID: 1, Type: order.OrderNormal})
	q.Push(&order.Order{ID: 2, Type: order.OrderVIP})
	q.Push(&order.Order{ID: 3, Type: order.OrderNormal})

	if got := q.Pop(); got.ID != 2 { t.Fatalf("want VIP(2), got %d", got.ID) }
	if got := q.Pop(); got.ID != 1 { t.Fatalf("want Normal(1), got %d", got.ID) }
	if got := q.Pop(); got.ID != 3 { t.Fatalf("want Normal(3), got %d", got.ID) }
}

func TestQueue_RemoveAt(t *testing.T) {
	q := order.NewQueue()
	q.Push(&order.Order{ID: 1, Type: order.OrderVIP})
	q.Push(&order.Order{ID: 2, Type: order.OrderNormal})
	if r := q.RemoveAt(0); r.ID != 1 { t.Fatalf("want 1, got %d", r.ID) }
	if q.Len() != 1 { t.Fatalf("want 1, got %d", q.Len()) }
}

func TestQueue_PopEmpty(t *testing.T) {
	q := order.NewQueue()
	if got := q.Pop(); got != nil { t.Fatalf("want nil, got %v", got) }
}
```

- [ ] **Run test to see fail**

```bash
go test ./tests/unit/business/order/ -v -run TestQueue
```

- [ ] **Create internal/business/order/queue.go**

```go
package order

import "container/heap"

type innerPQ []*Order
func (pq innerPQ) Len() int { return len(pq) }
func (pq innerPQ) Less(i, j int) bool {
	if pq[i].Type != pq[j].Type { return pq[i].Type > pq[j].Type }
	return i < j
}
func (pq innerPQ) Swap(i, j int) { pq[i], pq[j] = pq[j], pq[i] }
func (pq *innerPQ) Push(x any) { *pq = append(*pq, x.(*Order)) }
func (pq *innerPQ) Pop() any { n := len(*pq); x := (*pq)[n-1]; (*pq)[n-1] = nil; *pq = (*pq)[:n-1]; return x }

type Queue struct{ inner innerPQ }

func NewQueue() *Queue { q := &Queue{}; heap.Init(&q.inner); return q }
func (q *Queue) Push(o *Order) { heap.Push(&q.inner, o) }
func (q *Queue) Pop() *Order { if len(q.inner) == 0 { return nil }; return heap.Pop(&q.inner).(*Order) }
func (q *Queue) RemoveAt(i int) *Order { return heap.Remove(&q.inner, i).(*Order) }
func (q *Queue) Len() int { return len(q.inner) }
```

- [ ] **Run tests to verify pass**

```bash
go test ./tests/unit/business/order/ -v -run TestQueue
```

- [ ] **Commit**

```bash
git add internal/business/order/queue.go tests/unit/business/order/queue_test.go
git commit -m "feat: priority queue with container/heap"
```

---

### Task 4: Recorder — recorder.go + test

- [ ] **Write test at tests/unit/business/order/recorder_test.go**

```go
package order_test

import (
	"bytes"
	"strings"
	"testing"
	"time"
	"foundation-cli/internal/business/order"
)

func TestRecorder_HHMMSS(t *testing.T) {
	var b bytes.Buffer
	r := order.NewRecorder(&b)
	r.Record(time.Date(2026, 6, 11, 8, 5, 3, 0, time.UTC), "test")
	if !strings.Contains(b.String(), "[08:05:03] test") {
		t.Fatalf("got: %s", b.String())
	}
}

func TestRecorder_Summary(t *testing.T) {
	var b bytes.Buffer
	r := order.NewRecorder(&b)
	r.Record(time.Now(), "e1")
	r.Record(time.Now(), "e2")
	r.WriteSummary()
	if !strings.Contains(b.String(), "Total events: 2") {
		t.Fatalf("got: %s", b.String())
	}
}
```

- [ ] **Run test to see fail**

```bash
go test ./tests/unit/business/order/ -v -run TestRecorder
```

- [ ] **Create internal/business/order/recorder.go**

```go
package order

import (
	"fmt"
	"io"
	"time"
)

type Recorder struct {
	w      io.Writer
	events []Event
}

func NewRecorder(w io.Writer) *Recorder { return &Recorder{w: w} }

func (r *Recorder) Record(ts time.Time, msg string) {
	r.events = append(r.events, Event{Timestamp: ts, Message: msg})
	fmt.Fprintf(r.w, "[%s] %s\n", ts.Format("15:04:05"), msg)
}

func (r *Recorder) WriteSummary() {
	fmt.Fprintln(r.w, "")
	fmt.Fprintf(r.w, "=== Demo Summary ===\n")
	fmt.Fprintf(r.w, "Total events: %d\n", len(r.events))
}
```

- [ ] **Run tests to verify pass**

```bash
go test ./tests/unit/business/order/ -v -run TestRecorder
```

- [ ] **Commit**

```bash
git add internal/business/order/recorder.go tests/unit/business/order/recorder_test.go
git commit -m "feat: event recorder with HH:MM:SS"
```

---

### Task 5: Controller — controller.go + test

- [ ] **Write test at tests/unit/business/order/controller_test.go**

```go
package order_test

import (
	"testing"
	"time"
	"foundation-cli/internal/business/order"
)

func TestNewOrder_PendingCount(t *testing.T) {
	c := order.NewController()
	c.NewOrder(order.OrderNormal)
	if c.PendingCount() != 1 { t.Fatalf("got %d", c.PendingCount()) }
}

func TestNewOrder_SequentialIDs(t *testing.T) {
	c := order.NewController()
	o1 := c.NewOrder(order.OrderNormal)
	o2 := c.NewOrder(order.OrderVIP)
	if o2.ID != o1.ID+1 { t.Fatalf("got %d", o2.ID) }
}

func TestAddBot_ProcessesPending(t *testing.T) {
	c := order.NewController()
	c.NewOrder(order.OrderNormal)
	b := c.AddBot()
	if b.Status != order.BotBusy { t.Fatalf("want BUSY, got %v", b.Status) }
}

func TestAddBot_IdleWithoutOrders(t *testing.T) {
	c := order.NewController()
	if b := c.AddBot(); b.Status != order.BotIdle { t.Fatalf("want IDLE") }
}

func TestRemoveBot_DestroysNewest(t *testing.T) {
	c := order.NewController()
	b1 := c.AddBot()
	b2 := c.AddBot()
	if removed := c.RemoveBot(); removed.ID != b2.ID { t.Fatalf("want %d, got %d", b2.ID, removed.ID) }
	if c.BotCount() != 1 { t.Fatalf("want 1, got %d", c.BotCount()) }
}

func TestRemoveBot_ReturnsOrder(t *testing.T) {
	c := order.NewController()
	c.NewOrder(order.OrderNormal)
	c.AddBot()
	c.RemoveBot()
	if c.PendingCount() != 1 { t.Fatalf("want 1, got %d", c.PendingCount()) }
}

func TestIdleBot_PicksNewOrder(t *testing.T) {
	c := order.NewController()
	c.AddBot()
	c.NewOrder(order.OrderNormal)
	if c.PendingCount() != 0 {
		t.Fatalf("expected idle bot to pick order, got %d pending", c.PendingCount())
	}
}

func TestProcessingDuration_CompletesOrder(t *testing.T) {
	c := order.NewController(order.WithDuration(50*time.Millisecond))
	c.NewOrder(order.OrderNormal)
	c.AddBot()
	time.Sleep(100 * time.Millisecond)
	n := c.ProcessCompleted()
	if n != 1 { t.Fatalf("want 1 completed, got %d", n) }
}

func TestVIP_Priority(t *testing.T) {
	c := order.NewController(order.WithDuration(50*time.Millisecond))
	c.NewOrder(order.OrderNormal) // 1
	c.NewOrder(order.OrderVIP)    // 2
	c.AddBot()                    // picks VIP(2)
	time.Sleep(100 * time.Millisecond)
	c.ProcessCompleted()
	if c.CompletedCount() != 1 { t.Fatalf("want VIP completed, got %d", c.CompletedCount()) }
}
```

- [ ] **Run to see fail**

```bash
go test ./tests/unit/business/order/ -v -run TestNewOrder|TestAddBot|TestRemoveBot|TestIdleBot|TestProcessing|TestVIP
```

- [ ] **Create internal/business/order/controller.go**

```go
package order

import (
	"fmt"
	"sync"
	"time"
)

type Controller struct {
	mu                sync.Mutex
	queue             *Queue
	bots              []*Bot
	completed         []*Order
	nextOrderID       uint64
	nextBotID         uint64
	duration          time.Duration
	recorder          *Recorder
}

type ControllerOption func(*Controller)

func WithDuration(d time.Duration) ControllerOption {
	return func(c *Controller) { c.duration = d }
}

func NewController(opts ...ControllerOption) *Controller {
	c := &Controller{
		queue:       NewQueue(),
		duration:    10 * time.Second,
		nextOrderID: 1,
		nextBotID:   1,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func (c *Controller) NewOrder(t OrderType) *Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	o := &Order{ID: c.nextOrderID, Type: t, Status: OrderPending}
	c.nextOrderID++
	c.queue.Push(o)
	c.record("%s → PENDING", orderStr(o))
	c.dispatch()
	return o
}

func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	bot := &Bot{ID: c.nextBotID, Status: BotIdle}
	c.nextBotID++
	c.bots = append(c.bots, bot)
	c.record("+Bot #%d", bot.ID)
	c.dispatch()
	return bot
}

func (c *Controller) RemoveBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.bots) == 0 { return nil }
	bot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	if bot.Order != nil && bot.Status == BotBusy {
		bot.Order.Status = OrderPending
		bot.Order.ProcessingStarted = time.Time{}
		c.queue.Push(bot.Order)
		c.record("%s → returned to PENDING", orderStr(bot.Order))
	}
	c.record("-Bot #%d", bot.ID)
	return bot
}

func (c *Controller) ProcessCompleted() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	completed := 0
	for _, bot := range c.bots {
		if bot.Order == nil || bot.Order.ProcessingStarted.IsZero() {
			continue
		}
		if time.Since(bot.Order.ProcessingStarted) >= c.duration {
			bot.Order.Status = OrderCompleted
			c.completed = append(c.completed, bot.Order)
			c.record("%s → COMPLETED", orderStr(bot.Order))
			bot.Order = nil
			bot.Status = BotIdle
			completed++
		}
	}
	c.dispatch()
	return completed
}

func (c *Controller) dispatch() {
	for _, bot := range c.bots {
		if bot.Order != nil { continue }
		if c.queue.Len() == 0 { return }
		o := c.queue.Pop()
		o.Status = OrderProcessing
		o.ProcessingStarted = time.Now()
		bot.Order = o
		bot.Status = BotBusy
		c.record("%s → picked by Bot #%d", orderStr(o), bot.ID)
	}
}

func (c *Controller) PendingCount() int    { c.mu.Lock(); defer c.mu.Unlock(); return c.queue.Len() }
func (c *Controller) BotCount() int        { c.mu.Lock(); defer c.mu.Unlock(); return len(c.bots) }
func (c *Controller) CompletedCount() int  { c.mu.Lock(); defer c.mu.Unlock(); return len(c.completed) }

func (c *Controller) record(format string, args ...any) {
	if c.recorder != nil {
		c.recorder.Record(time.Now(), fmt.Sprintf(format, args...))
	}
}

func orderStr(o *Order) string {
	s := fmt.Sprintf("Order #%d", o.ID)
	if o.Type == OrderVIP { s += " (VIP)" } else { s += " (Normal)" }
	return s
}
```

- [ ] **Run tests to verify pass**

```bash
go test ./tests/unit/business/order/ -v -run "TestNewOrder|TestAddBot|TestRemoveBot|TestIdleBot|TestProcessing|TestVIP"
```

- [ ] **Commit**

```bash
git add internal/business/order/controller.go tests/unit/business/order/controller_test.go
git commit -m "feat: order controller with queue, bots, processing"
```

---

### Task 6: Demo Scenario — demo.go

- [ ] **Create internal/business/order/demo.go**

```go
package order

import (
	"fmt"
	"io"
	"time"
)

func RunDemo(w io.Writer) {
	r := NewRecorder(w)
	demoDuration := 2 * time.Second
	c := NewController(WithDuration(demoDuration))

	fmt.Fprintln(w, "=== McDonald's Order Controller Demo ===")
	fmt.Fprintln(w, "")

	// Background tick loop checks for completed orders
	done := make(chan struct{})
	go func() {
		tk := time.NewTicker(100 * time.Millisecond)
		defer tk.Stop()
		for {
			select {
			case <-tk.C:
				c.ProcessCompleted()
			case <-done:
				c.ProcessCompleted()
				return
			}
		}
	}()

	c.NewOrder(OrderNormal)
	c.NewOrder(OrderNormal)
	c.NewOrder(OrderVIP)
	c.NewOrder(OrderVIP)

	time.Sleep(200 * time.Millisecond)
	c.AddBot()
	c.AddBot()
	c.AddBot()

	time.Sleep(100 * time.Millisecond)
	c.RemoveBot()

	time.Sleep(demoDuration + 500*time.Millisecond)

	c.NewOrder(OrderNormal)

	time.Sleep(demoDuration + 500*time.Millisecond)

	close(done)
	r.WriteSummary()
	fmt.Fprintln(w, "=== Demo Complete ===")
}
```

- [ ] **Commit**

```bash
git add internal/business/order/demo.go
git commit -m "feat: built-in demo scenario"
```

---

### Task 7: Output Platform — streams.go + writer.go

- [ ] **Create internal/platform/output/streams.go**

```go
package output

import "io"

type Streams struct {
	Stdout io.Writer
	Stderr io.Writer
}

func DefaultStreams() Streams {
	return Streams{Stdout: io.Discard, Stderr: io.Discard}
}
```

- [ ] **Create internal/platform/output/writer.go**

```go
package output

import (
	"encoding/json"
	"fmt"
	"io"
)

func WriteRaw(w io.Writer, data []byte)     { w.Write(data) }
func WriteJSON(w io.Writer, v any)          { json.NewEncoder(w).SetEscapeHTML(false).Encode(v) }
func WriteError(w io.Writer, msg string)    { fmt.Fprintln(w, msg) }
```

- [ ] **Commit**

```bash
git add internal/platform/output/streams.go internal/platform/output/writer.go
git commit -m "feat: output stream utilities"
```

---

### Task 8: CLI Commands — cmd/root.go + main.go

- [ ] **Create cmd/root.go**

```go
package cmd

import (
	"github.com/spf13/cobra"
	"foundation-cli/internal/business/order"
)

func NewRootCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "order-controller",
		Short: "McDonald's order controller simulation",
		RunE: func(cmd *cobra.Command, args []string) error {
			order.RunDemo(cmd.OutOrStdout())
			return nil
		},
	}
}
```

- [ ] **Create cmd/foundation-cli/main.go**

```go
package main

import (
	"fmt"
	"os"
	"foundation-cli/cmd"
)

func main() {
	root := cmd.NewRootCommand()
	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
```

- [ ] **Verify build**

```bash
go build -o order-controller ./cmd/foundation-cli
```

- [ ] **Commit**

```bash
git add cmd/root.go cmd/foundation-cli/main.go
git commit -m "feat: cobra CLI commands with demo entry"
```

---

### Task 9: Update CI Scripts

- [ ] **Write scripts/test.sh**

```bash
#!/bin/bash
set -e
echo "Running unit tests..."
go test ./... -v
echo "All tests passed"
```

- [ ] **Write scripts/build.sh**

```bash
#!/bin/bash
set -e
echo "Building CLI application..."
go build -o order-controller ./cmd/foundation-cli
echo "Build completed"
```

- [ ] **Write scripts/run.sh**

```bash
#!/bin/bash
set -e
echo "Running CLI application..."
./order-controller > scripts/result.txt
echo "Output written to scripts/result.txt"
```

- [ ] **Run end-to-end**

```bash
go vet ./...
go test ./... -v
go build -o order-controller ./cmd/foundation-cli
./order-controller
```

- [ ] **Commit**

```bash
git add scripts/
git commit -m "chore: update CI scripts for Go"
```
