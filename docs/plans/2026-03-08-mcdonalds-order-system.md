# McDonald's Order Management System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack McDonald's order management system with Go backend (CLI + API server) and SvelteKit frontend.

**Architecture:** Shared core engine in `backend/internal/`, two entrypoints (`cmd/cli` for CI, `cmd/server` for API+frontend), SvelteKit frontend built as static assets and embedded into the Go server binary.

**Tech Stack:** Go 1.23+, SvelteKit, Tailwind CSS, gorilla/websocket, adapter-static

---

### Task 1: Go Module & Core Order Model

**Files:**
- Create: `backend/go.mod`
- Create: `backend/internal/core/order.go`
- Create: `backend/internal/core/order_test.go`

**Step 1: Initialize Go module**

```bash
cd backend && go mod init github.com/feedme/order-controller
```

**Step 2: Write failing test for order creation and priority queue**

```go
// backend/internal/core/order_test.go
package core

import "testing"

func TestNewOrder(t *testing.T) {
	q := NewOrderQueue()
	o := q.Add(Normal)
	if o.ID != 1 {
		t.Errorf("expected ID 1, got %d", o.ID)
	}
	if o.Type != Normal {
		t.Errorf("expected Normal, got %v", o.Type)
	}
	if o.Status != Pending {
		t.Errorf("expected Pending, got %v", o.Status)
	}
}

func TestVIPPriority(t *testing.T) {
	q := NewOrderQueue()
	q.Add(Normal)  // #1
	q.Add(Normal)  // #2
	q.Add(VIP)     // #3 — should be first in queue
	q.Add(Normal)  // #4
	q.Add(VIP)     // #5 — should be after #3 but before normals

	o := q.Dequeue()
	if o.ID != 3 {
		t.Errorf("expected VIP #3 first, got #%d", o.ID)
	}
	o = q.Dequeue()
	if o.ID != 5 {
		t.Errorf("expected VIP #5 second, got #%d", o.ID)
	}
	o = q.Dequeue()
	if o.ID != 1 {
		t.Errorf("expected Normal #1 third, got #%d", o.ID)
	}
}

func TestDequeueEmpty(t *testing.T) {
	q := NewOrderQueue()
	o := q.Dequeue()
	if o != nil {
		t.Error("expected nil from empty queue")
	}
}

func TestReturnToQueue(t *testing.T) {
	q := NewOrderQueue()
	q.Add(Normal)  // #1
	o := q.Dequeue()
	q.Return(o)
	got := q.Dequeue()
	if got.ID != 1 {
		t.Errorf("expected returned order #1, got #%d", got.ID)
	}
}
```

**Step 3: Run test to verify it fails**

```bash
cd backend && go test ./internal/core/ -v
```
Expected: FAIL — types/functions not defined.

**Step 4: Implement order model and priority queue**

```go
// backend/internal/core/order.go
package core

import (
	"sync"
	"time"
)

type OrderType int

const (
	Normal OrderType = iota
	VIP
)

func (t OrderType) String() string {
	if t == VIP {
		return "VIP"
	}
	return "Normal"
}

type OrderStatus int

const (
	Pending OrderStatus = iota
	Processing
	Complete
)

func (s OrderStatus) String() string {
	switch s {
	case Processing:
		return "PROCESSING"
	case Complete:
		return "COMPLETE"
	default:
		return "PENDING"
	}
}

type Order struct {
	ID        int         `json:"id"`
	Type      OrderType   `json:"type"`
	Status    OrderStatus `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
}

type OrderQueue struct {
	mu      sync.Mutex
	orders  []*Order
	nextID  int
}

func NewOrderQueue() *OrderQueue {
	return &OrderQueue{nextID: 1}
}

func (q *OrderQueue) Add(orderType OrderType) *Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	o := &Order{
		ID:        q.nextID,
		Type:      orderType,
		Status:    Pending,
		CreatedAt: time.Now(),
	}
	q.nextID++

	if orderType == VIP {
		// Insert after last VIP
		insertAt := 0
		for i, existing := range q.orders {
			if existing.Type == VIP {
				insertAt = i + 1
			}
		}
		q.orders = append(q.orders, nil)
		copy(q.orders[insertAt+1:], q.orders[insertAt:])
		q.orders[insertAt] = o
	} else {
		q.orders = append(q.orders, o)
	}

	return o
}

func (q *OrderQueue) Dequeue() *Order {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.orders) == 0 {
		return nil
	}
	o := q.orders[0]
	q.orders = q.orders[1:]
	return o
}

func (q *OrderQueue) Return(o *Order) {
	q.mu.Lock()
	defer q.mu.Unlock()

	o.Status = Pending

	if o.Type == VIP {
		insertAt := 0
		for i, existing := range q.orders {
			if existing.Type == VIP {
				insertAt = i + 1
			}
		}
		q.orders = append(q.orders, nil)
		copy(q.orders[insertAt+1:], q.orders[insertAt:])
		q.orders[insertAt] = o
	} else {
		q.orders = append(q.orders, o)
	}
}

func (q *OrderQueue) Pending() []*Order {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]*Order, len(q.orders))
	copy(result, q.orders)
	return result
}

func (q *OrderQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.orders)
}
```

**Step 5: Run tests and verify pass**

```bash
cd backend && go test ./internal/core/ -v
```
Expected: ALL PASS

**Step 6: Commit**

```bash
git add backend/go.mod backend/internal/core/
git commit -m "feat: add order model with priority queue"
```

---

### Task 2: Bot Model

**Files:**
- Create: `backend/internal/core/bot.go`
- Create: `backend/internal/core/bot_test.go`

**Step 1: Write failing test for bot**

```go
// backend/internal/core/bot_test.go
package core

import "testing"

func TestNewBot(t *testing.T) {
	b := NewBot(1)
	if b.ID != 1 {
		t.Errorf("expected ID 1, got %d", b.ID)
	}
	if b.Status != Idle {
		t.Errorf("expected Idle, got %v", b.Status)
	}
	if b.Order != nil {
		t.Error("expected nil order")
	}
}

func TestBotAssignOrder(t *testing.T) {
	b := NewBot(1)
	o := &Order{ID: 1, Type: Normal, Status: Pending}
	b.Assign(o)
	if b.Status != BotProcessing {
		t.Errorf("expected Processing, got %v", b.Status)
	}
	if b.Order.ID != 1 {
		t.Errorf("expected order 1, got %d", b.Order.ID)
	}
	if o.Status != Processing {
		t.Errorf("expected order status Processing, got %v", o.Status)
	}
}

func TestBotComplete(t *testing.T) {
	b := NewBot(1)
	o := &Order{ID: 1, Type: Normal, Status: Pending}
	b.Assign(o)
	completed := b.Complete()
	if b.Status != Idle {
		t.Errorf("expected Idle, got %v", b.Status)
	}
	if completed.Status != Complete {
		t.Errorf("expected Complete, got %v", completed.Status)
	}
	if b.Order != nil {
		t.Error("expected nil order after complete")
	}
}

func TestBotCancelOrder(t *testing.T) {
	b := NewBot(1)
	o := &Order{ID: 1, Type: Normal, Status: Pending}
	b.Assign(o)
	cancelled := b.Cancel()
	if cancelled.ID != 1 {
		t.Errorf("expected order 1, got %d", cancelled.ID)
	}
	if b.Order != nil {
		t.Error("expected nil order after cancel")
	}
}
```

**Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/core/ -v -run TestBot
```
Expected: FAIL

**Step 3: Implement bot model**

```go
// backend/internal/core/bot.go
package core

type BotStatus int

const (
	Idle BotStatus = iota
	BotProcessing
)

func (s BotStatus) String() string {
	if s == BotProcessing {
		return "PROCESSING"
	}
	return "IDLE"
}

type Bot struct {
	ID     int       `json:"id"`
	Status BotStatus `json:"status"`
	Order  *Order    `json:"order,omitempty"`
}

func NewBot(id int) *Bot {
	return &Bot{ID: id, Status: Idle}
}

func (b *Bot) Assign(o *Order) {
	b.Status = BotProcessing
	b.Order = o
	o.Status = Processing
}

func (b *Bot) Complete() *Order {
	o := b.Order
	o.Status = Complete
	b.Order = nil
	b.Status = Idle
	return o
}

func (b *Bot) Cancel() *Order {
	o := b.Order
	b.Order = nil
	b.Status = Idle
	return o
}
```

**Step 4: Run tests and verify pass**

```bash
cd backend && go test ./internal/core/ -v
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/internal/core/bot.go backend/internal/core/bot_test.go
git commit -m "feat: add bot model with assign/complete/cancel"
```

---

### Task 3: Order Engine

**Files:**
- Create: `backend/internal/engine/engine.go`
- Create: `backend/internal/engine/engine_test.go`

**Step 1: Write failing test for engine orchestration**

```go
// backend/internal/engine/engine_test.go
package engine

import (
	"testing"
	"time"

	"github.com/feedme/order-controller/internal/core"
)

func TestAddOrder(t *testing.T) {
	e := New(10 * time.Millisecond) // fast processing for tests
	e.AddOrder(core.Normal)
	state := e.State()
	if len(state.PendingOrders) != 1 {
		t.Errorf("expected 1 pending order, got %d", len(state.PendingOrders))
	}
}

func TestAddBotPicksUpOrder(t *testing.T) {
	e := New(10 * time.Millisecond)
	e.AddOrder(core.Normal)
	e.AddBot()
	time.Sleep(5 * time.Millisecond) // let bot pick up
	state := e.State()
	if len(state.Bots) != 1 {
		t.Fatalf("expected 1 bot, got %d", len(state.Bots))
	}
	if state.Bots[0].Status != core.BotProcessing {
		t.Errorf("expected bot processing, got %v", state.Bots[0].Status)
	}
}

func TestBotCompletesOrder(t *testing.T) {
	e := New(50 * time.Millisecond)
	e.AddOrder(core.Normal)
	e.AddBot()
	time.Sleep(100 * time.Millisecond) // wait for processing
	state := e.State()
	if len(state.CompletedOrders) != 1 {
		t.Errorf("expected 1 completed, got %d", len(state.CompletedOrders))
	}
}

func TestVIPPriorityInEngine(t *testing.T) {
	e := New(50 * time.Millisecond)
	e.AddOrder(core.Normal)  // #1
	e.AddOrder(core.Normal)  // #2
	e.AddOrder(core.VIP)     // #3
	e.AddBot()
	time.Sleep(10 * time.Millisecond) // let bot pick up
	state := e.State()
	// Bot should pick up VIP #3 first
	if state.Bots[0].Order == nil || state.Bots[0].Order.ID != 3 {
		t.Errorf("expected bot to pick up VIP order #3")
	}
}

func TestRemoveBotReturnsOrder(t *testing.T) {
	e := New(5 * time.Second) // long processing so bot is still busy
	e.AddOrder(core.Normal)
	e.AddBot()
	time.Sleep(10 * time.Millisecond) // let bot pick up
	e.RemoveBot()
	state := e.State()
	if len(state.Bots) != 0 {
		t.Errorf("expected 0 bots, got %d", len(state.Bots))
	}
	if len(state.PendingOrders) != 1 {
		t.Errorf("expected 1 pending (returned), got %d", len(state.PendingOrders))
	}
}

func TestRemoveNewestBot(t *testing.T) {
	e := New(5 * time.Second)
	e.AddBot() // #1
	e.AddBot() // #2
	e.RemoveBot()
	state := e.State()
	if len(state.Bots) != 1 {
		t.Fatalf("expected 1 bot, got %d", len(state.Bots))
	}
	if state.Bots[0].ID != 1 {
		t.Errorf("expected bot #1 to remain, got #%d", state.Bots[0].ID)
	}
}

func TestIdleBotPicksUpNewOrder(t *testing.T) {
	e := New(50 * time.Millisecond)
	e.AddBot()
	time.Sleep(5 * time.Millisecond) // bot is idle
	e.AddOrder(core.Normal)
	time.Sleep(10 * time.Millisecond) // let bot pick up
	state := e.State()
	if state.Bots[0].Status != core.BotProcessing {
		t.Errorf("expected idle bot to pick up order")
	}
}
```

**Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/engine/ -v
```
Expected: FAIL

**Step 3: Implement engine**

The engine manages bots as goroutines. Each bot runs a loop: pick up order → process (sleep) → complete → repeat. The engine signals bots via channels when new orders arrive.

```go
// backend/internal/engine/engine.go
package engine

import (
	"sync"
	"time"

	"github.com/feedme/order-controller/internal/core"
)

type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type State struct {
	PendingOrders    []*core.Order `json:"pending_orders"`
	CompletedOrders  []*core.Order `json:"completed_orders"`
	Bots             []*core.Bot   `json:"bots"`
}

type botHandle struct {
	bot    *core.Bot
	notify chan struct{}
	stop   chan struct{}
}

type Engine struct {
	mu              sync.Mutex
	queue           *core.OrderQueue
	bots            []*botHandle
	completed       []*core.Order
	nextBotID       int
	processTime     time.Duration
	eventListeners  []func(Event)
}

func New(processTime time.Duration) *Engine {
	return &Engine{
		queue:       core.NewOrderQueue(),
		nextBotID:   1,
		processTime: processTime,
	}
}

func (e *Engine) OnEvent(fn func(Event)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.eventListeners = append(e.eventListeners, fn)
}

func (e *Engine) emit(event Event) {
	for _, fn := range e.eventListeners {
		fn(event)
	}
}

func (e *Engine) AddOrder(orderType core.OrderType) *core.Order {
	e.mu.Lock()
	o := e.queue.Add(orderType)
	e.emit(Event{Type: "order_created", Payload: o})
	// Notify idle bots
	for _, bh := range e.bots {
		if bh.bot.Status == core.Idle {
			select {
			case bh.notify <- struct{}{}:
			default:
			}
		}
	}
	e.mu.Unlock()
	return o
}

func (e *Engine) AddBot() *core.Bot {
	e.mu.Lock()
	b := core.NewBot(e.nextBotID)
	e.nextBotID++
	bh := &botHandle{
		bot:    b,
		notify: make(chan struct{}, 1),
		stop:   make(chan struct{}),
	}
	e.bots = append(e.bots, bh)
	e.emit(Event{Type: "bot_created", Payload: b})
	e.mu.Unlock()

	go e.runBot(bh)

	// Kick the bot to check for orders
	select {
	case bh.notify <- struct{}{}:
	default:
	}

	return b
}

func (e *Engine) runBot(bh *botHandle) {
	for {
		select {
		case <-bh.stop:
			return
		case <-bh.notify:
			e.tryPickup(bh)
		}
	}
}

func (e *Engine) tryPickup(bh *botHandle) {
	e.mu.Lock()
	o := e.queue.Dequeue()
	if o == nil {
		e.mu.Unlock()
		return
	}
	bh.bot.Assign(o)
	e.emit(Event{Type: "order_processing", Payload: map[string]interface{}{"bot": bh.bot, "order": o}})
	e.mu.Unlock()

	// Process order
	timer := time.NewTimer(e.processTime)
	select {
	case <-timer.C:
		e.mu.Lock()
		completed := bh.bot.Complete()
		e.completed = append(e.completed, completed)
		e.emit(Event{Type: "order_completed", Payload: map[string]interface{}{"bot": bh.bot, "order": completed}})
		e.emit(Event{Type: "bot_idle", Payload: bh.bot})
		e.mu.Unlock()

		// Check for more orders
		select {
		case bh.notify <- struct{}{}:
		default:
		}
	case <-bh.stop:
		timer.Stop()
		return
	}
}

func (e *Engine) RemoveBot() {
	e.mu.Lock()
	defer e.mu.Unlock()

	if len(e.bots) == 0 {
		return
	}

	// Remove newest (last) bot
	bh := e.bots[len(e.bots)-1]
	e.bots = e.bots[:len(e.bots)-1]

	// If bot was processing, return order to queue
	if bh.bot.Status == core.BotProcessing {
		o := bh.bot.Cancel()
		e.queue.Return(o)
	}

	close(bh.stop)
	e.emit(Event{Type: "bot_destroyed", Payload: bh.bot})
}

func (e *Engine) State() State {
	e.mu.Lock()
	defer e.mu.Unlock()

	bots := make([]*core.Bot, len(e.bots))
	for i, bh := range e.bots {
		bots[i] = bh.bot
	}

	return State{
		PendingOrders:   e.queue.Pending(),
		CompletedOrders: append([]*core.Order{}, e.completed...),
		Bots:            bots,
	}
}
```

**Step 4: Run tests and verify pass**

```bash
cd backend && go test ./internal/engine/ -v -race
```
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/internal/engine/
git commit -m "feat: add order engine with bot goroutines"
```

---

### Task 4: CLI Entrypoint

**Files:**
- Create: `backend/cmd/cli/main.go`

**Step 1: Implement CLI simulation**

The CLI runs a hardcoded scenario that exercises all requirements, printing timestamped output matching the expected `result.txt` format.

```go
// backend/cmd/cli/main.go
package main

import (
	"fmt"
	"time"

	"github.com/feedme/order-controller/internal/core"
	"github.com/feedme/order-controller/internal/engine"
)

func ts() string {
	return time.Now().Format("15:04:05")
}

func main() {
	fmt.Println("McDonald's Order Management System - Simulation Results")
	fmt.Println()

	e := engine.New(10 * time.Second)

	e.OnEvent(func(ev engine.Event) {
		switch ev.Type {
		case "order_created":
			o := ev.Payload.(*core.Order)
			fmt.Printf("[%s] Created %s Order #%d - Status: %s\n", ts(), o.Type, o.ID, o.Status)
		case "order_processing":
			p := ev.Payload.(map[string]interface{})
			b := p["bot"].(*core.Bot)
			o := p["order"].(*core.Order)
			fmt.Printf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING\n", ts(), b.ID, o.Type, o.ID)
		case "order_completed":
			p := ev.Payload.(map[string]interface{})
			b := p["bot"].(*core.Bot)
			o := p["order"].(*core.Order)
			fmt.Printf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)\n", ts(), b.ID, o.Type, o.ID)
		case "bot_created":
			b := ev.Payload.(*core.Bot)
			fmt.Printf("[%s] Bot #%d created - Status: ACTIVE\n", ts(), b.ID)
		case "bot_destroyed":
			b := ev.Payload.(*core.Bot)
			fmt.Printf("[%s] Bot #%d destroyed\n", ts(), b.ID)
		case "bot_idle":
			b := ev.Payload.(*core.Bot)
			fmt.Printf("[%s] Bot #%d is now IDLE - No pending orders\n", ts(), b.ID)
		}
	})

	fmt.Printf("[%s] System initialized with 0 bots\n", ts())

	// Scenario: matches sample result.txt flow
	e.AddOrder(core.Normal) // #1
	time.Sleep(1 * time.Second)
	e.AddOrder(core.VIP)    // #2
	e.AddOrder(core.Normal) // #3
	time.Sleep(1 * time.Second)

	e.AddBot() // Bot #1 — picks up VIP #2
	time.Sleep(1 * time.Second)
	e.AddBot() // Bot #2 — picks up Normal #1

	// Wait for both to complete
	time.Sleep(12 * time.Second)

	// Add another VIP
	e.AddOrder(core.VIP) // #4
	time.Sleep(12 * time.Second)

	// Remove bot #2
	e.RemoveBot()
	time.Sleep(1 * time.Second)

	state := e.State()
	fmt.Println()
	fmt.Println("Final Status:")
	vipCount := 0
	normalCount := 0
	for _, o := range state.CompletedOrders {
		if o.Type == core.VIP {
			vipCount++
		} else {
			normalCount++
		}
	}
	total := vipCount + normalCount
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", total, vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", total)
	fmt.Printf("- Active Bots: %d\n", len(state.Bots))
	fmt.Printf("- Pending Orders: %d\n", len(state.PendingOrders))
}
```

**Step 2: Build and run to verify output**

```bash
cd backend && go build -o order-controller ./cmd/cli && ./order-controller
```
Expected: Timestamped output matching the format in `scripts/result.txt`

**Step 3: Commit**

```bash
git add backend/cmd/cli/
git commit -m "feat: add CLI entrypoint for CI simulation"
```

---

### Task 5: Update Shell Scripts

**Files:**
- Modify: `scripts/test.sh`
- Modify: `scripts/build.sh`
- Modify: `scripts/run.sh`

**Step 1: Update test.sh**

```bash
#!/bin/bash
echo "Running unit tests..."
cd backend && go test ./... -v
echo "Unit tests completed"
```

**Step 2: Update build.sh**

```bash
#!/bin/bash
echo "Building CLI application..."
cd backend && go build -o order-controller ./cmd/cli
echo "Build completed"
```

**Step 3: Update run.sh**

```bash
#!/bin/bash
echo "Running CLI application..."
cd backend && ./order-controller > ../scripts/result.txt
echo "CLI application execution completed"
```

**Step 4: Test the full pipeline**

```bash
./scripts/test.sh && ./scripts/build.sh && ./scripts/run.sh && cat scripts/result.txt
```
Expected: Tests pass, builds successfully, `result.txt` has timestamped output with `HH:MM:SS` format.

**Step 5: Commit**

```bash
git add scripts/test.sh scripts/build.sh scripts/run.sh
git commit -m "feat: update shell scripts for Go backend"
```

---

### Task 6: API Server — REST Handlers

**Files:**
- Create: `backend/internal/api/handler.go`
- Create: `backend/cmd/server/main.go`

**Step 1: Implement REST handlers**

```go
// backend/internal/api/handler.go
package api

import (
	"encoding/json"
	"net/http"

	"github.com/feedme/order-controller/internal/core"
	"github.com/feedme/order-controller/internal/engine"
)

type Handler struct {
	engine *engine.Engine
}

func NewHandler(e *engine.Engine) *Handler {
	return &Handler{engine: e}
}

func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	orderType := core.Normal
	if req.Type == "vip" {
		orderType = core.VIP
	}

	o := h.engine.AddOrder(orderType)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(o)
}

func (h *Handler) AddBot(w http.ResponseWriter, r *http.Request) {
	b := h.engine.AddBot()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(b)
}

func (h *Handler) RemoveBot(w http.ResponseWriter, r *http.Request) {
	h.engine.RemoveBot()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetState(w http.ResponseWriter, r *http.Request) {
	state := h.engine.State()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}
```

**Step 2: Implement server entrypoint (without frontend embed yet)**

```go
// backend/cmd/server/main.go
package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/feedme/order-controller/internal/api"
	"github.com/feedme/order-controller/internal/engine"
)

func main() {
	e := engine.New(10 * time.Second)
	h := api.NewHandler(e)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/orders", h.CreateOrder)
	mux.HandleFunc("POST /api/bots", h.AddBot)
	mux.HandleFunc("DELETE /api/bots", h.RemoveBot)
	mux.HandleFunc("GET /api/state", h.GetState)

	fmt.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
```

**Step 3: Verify it compiles**

```bash
cd backend && go build ./cmd/server/
```
Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add backend/internal/api/handler.go backend/cmd/server/
git commit -m "feat: add REST API handlers and server entrypoint"
```

---

### Task 7: WebSocket Hub

**Files:**
- Create: `backend/internal/api/websocket.go`
- Modify: `backend/cmd/server/main.go`

**Step 1: Add gorilla/websocket dependency**

```bash
cd backend && go get github.com/gorilla/websocket
```

**Step 2: Implement WebSocket hub**

```go
// backend/internal/api/websocket.go
package api

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/feedme/order-controller/internal/engine"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Hub struct {
	mu      sync.Mutex
	clients map[*websocket.Conn]bool
	engine  *engine.Engine
}

func NewHub(e *engine.Engine) *Hub {
	h := &Hub{
		clients: make(map[*websocket.Conn]bool),
		engine:  e,
	}

	e.OnEvent(func(ev engine.Event) {
		h.broadcast(ev)
	})

	return h
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("websocket upgrade error: %v", err)
		return
	}

	h.mu.Lock()
	h.clients[conn] = true
	h.mu.Unlock()

	// Send current state on connect
	state := h.engine.State()
	msg, _ := json.Marshal(engine.Event{Type: "state_sync", Payload: state})
	conn.WriteMessage(websocket.TextMessage, msg)

	// Read loop (keeps connection alive, handles close)
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			h.mu.Lock()
			delete(h.clients, conn)
			h.mu.Unlock()
			conn.Close()
			break
		}
	}
}

func (h *Hub) broadcast(ev engine.Event) {
	msg, err := json.Marshal(ev)
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for conn := range h.clients {
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			conn.Close()
			delete(h.clients, conn)
		}
	}
}
```

**Step 3: Wire WebSocket into server**

Add to `cmd/server/main.go` after handler setup:

```go
hub := api.NewHub(e)
mux.HandleFunc("GET /ws", hub.HandleWS)
```

**Step 4: Verify it compiles**

```bash
cd backend && go build ./cmd/server/
```

**Step 5: Commit**

```bash
git add backend/internal/api/websocket.go backend/cmd/server/main.go backend/go.sum
git commit -m "feat: add WebSocket hub for real-time updates"
```

---

### Task 8: SvelteKit Frontend Setup

**Files:**
- Create: `frontend/` (via scaffolding)

**Step 1: Scaffold SvelteKit project**

```bash
cd /Users/kinmeng/CurrentProjects/feedme/se-take-home-assignment
npx sv create frontend --template minimal --types ts
cd frontend && npm install
npm install -D tailwindcss @tailwindcss/vite
```

**Step 2: Configure adapter-static**

```bash
cd frontend && npm install -D @sveltejs/adapter-static
```

Update `svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' })
  }
};
```

**Step 3: Configure Tailwind in `vite.config.ts`**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true }
    }
  }
});
```

**Step 4: Add Tailwind CSS import**

Create `frontend/src/app.css`:
```css
@import "tailwindcss";
```

Add to `frontend/src/routes/+layout.svelte`:
```svelte
<script>
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

**Step 5: Verify it builds**

```bash
cd frontend && npm run build
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold SvelteKit frontend with Tailwind"
```

---

### Task 9: Frontend — WebSocket Client & Store

**Files:**
- Create: `frontend/src/lib/websocket.ts`
- Create: `frontend/src/lib/stores/orders.ts`
- Create: `frontend/src/lib/types.ts`

**Step 1: Define types**

```ts
// frontend/src/lib/types.ts
export interface Order {
  id: number;
  type: number; // 0 = Normal, 1 = VIP
  status: number; // 0 = Pending, 1 = Processing, 2 = Complete
  created_at: string;
}

export interface Bot {
  id: number;
  status: number; // 0 = Idle, 1 = Processing
  order?: Order;
}

export interface AppState {
  pending_orders: Order[];
  completed_orders: Order[];
  bots: Bot[];
}

export interface WSEvent {
  type: string;
  payload: any;
}
```

**Step 2: Create Svelte store**

```ts
// frontend/src/lib/stores/orders.ts
import { writable } from 'svelte/store';
import type { AppState } from '$lib/types';

export const state = writable<AppState>({
  pending_orders: [],
  completed_orders: [],
  bots: []
});
```

**Step 3: Create WebSocket client**

```ts
// frontend/src/lib/websocket.ts
import { state } from '$lib/stores/orders';
import type { WSEvent } from '$lib/types';

let ws: WebSocket | null = null;

export function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onmessage = (event) => {
    const data: WSEvent = JSON.parse(event.data);
    if (data.type === 'state_sync') {
      state.set(data.payload);
    } else {
      // For individual events, refetch full state
      fetchState();
    }
  };

  ws.onclose = () => {
    setTimeout(connect, 1000); // reconnect
  };
}

async function fetchState() {
  const res = await fetch('/api/state');
  const data = await res.json();
  state.set(data);
}

export async function addOrder(type: 'normal' | 'vip') {
  await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type })
  });
}

export async function addBot() {
  await fetch('/api/bots', { method: 'POST' });
}

export async function removeBot() {
  await fetch('/api/bots', { method: 'DELETE' });
}
```

**Step 4: Commit**

```bash
git add frontend/src/lib/
git commit -m "feat: add WebSocket client, store, and types"
```

---

### Task 10: Frontend — UI Components

**Files:**
- Create: `frontend/src/lib/components/Controls.svelte`
- Create: `frontend/src/lib/components/OrderCard.svelte`
- Create: `frontend/src/lib/components/PendingArea.svelte`
- Create: `frontend/src/lib/components/CompleteArea.svelte`
- Create: `frontend/src/lib/components/BotPanel.svelte`
- Modify: `frontend/src/routes/+page.svelte`

**Step 1: Build all components**

`Controls.svelte` — 4 action buttons (New Normal Order, New VIP Order, + Bot, - Bot)
`OrderCard.svelte` — displays order #, type badge (gold for VIP), status
`PendingArea.svelte` — lists pending/processing orders
`CompleteArea.svelte` — lists completed orders
`BotPanel.svelte` — shows bots with status and current order

Use McDonald's palette:
- Background: `#27251F` (dark)
- Primary red: `#DA291C`
- Primary yellow: `#FFC72C`
- VIP badge: gold gradient
- Cards: white/light with subtle shadows

**Step 2: Wire up `+page.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { connect } from '$lib/websocket';
  import { state } from '$lib/stores/orders';
  import Controls from '$lib/components/Controls.svelte';
  import PendingArea from '$lib/components/PendingArea.svelte';
  import CompleteArea from '$lib/components/CompleteArea.svelte';
  import BotPanel from '$lib/components/BotPanel.svelte';

  onMount(() => connect());
</script>

<div class="min-h-screen bg-[#27251F] text-white">
  <header class="bg-[#DA291C] p-4 text-center">
    <h1 class="text-3xl font-bold text-[#FFC72C]">McDonald's Order System</h1>
  </header>

  <Controls />

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
    <PendingArea orders={$state.pending_orders} bots={$state.bots} />
    <CompleteArea orders={$state.completed_orders} />
    <BotPanel bots={$state.bots} />
  </div>
</div>
```

**Step 3: Verify dev server works**

```bash
cd frontend && npm run dev
```
Visit `http://localhost:5173` — UI should render (no data until backend runs).

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add frontend UI components with McDonald's theme"
```

---

### Task 11: Static Asset Embedding in Go Server

**Files:**
- Modify: `backend/cmd/server/main.go`
- Create: `backend/cmd/server/static/` (placeholder for built frontend)

**Step 1: Add embed directive and static file serving**

Update `cmd/server/main.go` to embed the `static/` directory and serve it as the fallback for non-API routes:

```go
//go:embed static/*
var staticFiles embed.FS

// In main(), after API routes:
staticFS, _ := fs.Sub(staticFiles, "static")
fileServer := http.FileServer(http.FS(staticFS))
mux.Handle("GET /", fileServer)
```

**Step 2: Update `build.sh` to copy frontend build output**

```bash
cd frontend && npm ci && npm run build
cp -r frontend/build/* backend/cmd/server/static/
cd backend && go build -o order-controller-server ./cmd/server
```

**Step 3: Commit**

```bash
git add backend/cmd/server/
git commit -m "feat: embed frontend static assets in Go server"
```

---

### Task 12: Dockerfile & Fly.io Deployment

**Files:**
- Create: `Dockerfile`
- Create: `fly.toml`

**Step 1: Create multi-stage Dockerfile**

```dockerfile
FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.23 AS backend-build
WORKDIR /app/backend
COPY backend/go.* ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-build /app/frontend/build ./cmd/server/static/
RUN CGO_ENABLED=0 go build -o /server ./cmd/server

FROM gcr.io/distroless/static
COPY --from=backend-build /server /server
EXPOSE 8080
CMD ["/server"]
```

**Step 2: Create fly.toml**

```toml
app = "mcdonalds-order-system"
primary_region = "sin"

[http_service]
  internal_port = 8080
  force_https = true

[build]
```

**Step 3: Deploy (manual)**

```bash
fly launch  # first time
fly deploy  # subsequent
```

**Step 4: Commit**

```bash
git add Dockerfile fly.toml
git commit -m "feat: add Dockerfile and Fly.io config"
```

---

### Task 13: End-to-End Verification

**Step 1: Run CI pipeline locally**

```bash
./scripts/test.sh && ./scripts/build.sh && ./scripts/run.sh
cat scripts/result.txt
```

Verify: timestamps in `HH:MM:SS` format, non-empty output.

**Step 2: Run server locally and test UI**

```bash
cd backend && go run ./cmd/server/
```

In another terminal:
```bash
cd frontend && npm run dev
```

Test all interactions: add normal/VIP orders, add/remove bots, verify real-time updates.

**Step 3: Verify Docker build**

```bash
docker build -t mcdonalds-order .
docker run -p 8080:8080 mcdonalds-order
```

Visit `http://localhost:8080` — full app should work.

**Step 4: Commit any fixes and create PR**

```bash
git push origin HEAD
gh pr create --title "feat: McDonald's order management system" --body "Full-stack implementation with Go backend and SvelteKit frontend"
```
