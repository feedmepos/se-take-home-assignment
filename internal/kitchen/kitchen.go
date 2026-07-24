package kitchen

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

const ProcessingDuration = 10 * time.Second

type OrderKind string

const (
	Normal OrderKind = "Normal"
	VIP    OrderKind = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	Idle   BotStatus = "IDLE"
	Active BotStatus = "ACTIVE"
)

type (
	Order struct {
		ID          int
		Kind        OrderKind
		Status      OrderStatus
		CreatedSeq  int
		StartedAt   time.Time
		CompletedAt time.Time
	}
	Bot struct {
		ID     int
		Status BotStatus
		Order  *Order
	}
	Kitchen struct {
		mu          sync.Mutex
		nextOrderID int
		nextBotID   int
		pending     []*Order
		complete    []*Order
		bots        []*Bot
		logs        []string
		idle        *sync.Cond

		processingDuration time.Duration
	}
)

func New() *Kitchen {
	k := &Kitchen{
		nextOrderID:        1,
		nextBotID:          1,
		processingDuration: ProcessingDuration,
	}
	k.idle = sync.NewCond(&k.mu)
	k.log("System initialized with 0 bots")
	return k
}

func (k *Kitchen) AddOrder(kind OrderKind) int {
	k.mu.Lock()
	defer k.mu.Unlock()
	defer k.notifyIfIdle()

	order := &Order{
		ID:         k.nextOrderID,
		Kind:       kind,
		Status:     Pending,
		CreatedSeq: k.nextOrderID,
	}
	k.nextOrderID++

	k.enqueue(order)
	k.log("%s Order #%d created - Status: %s", order.Kind, order.ID, order.Status)
	k.assignIdleBots()

	return order.ID
}

func (k *Kitchen) AddBot() int {
	k.mu.Lock()
	defer k.mu.Unlock()
	defer k.notifyIfIdle()

	bot := &Bot{
		ID:     k.nextBotID,
		Status: Idle,
	}
	k.nextBotID++
	k.bots = append(k.bots, bot)

	k.log("Bot #%d created - Status: %s", bot.ID, bot.Status)
	k.assignIdleBots()

	return bot.ID
}

func (k *Kitchen) RemoveBot() {
	k.mu.Lock()
	defer k.mu.Unlock()
	defer k.notifyIfIdle()

	if len(k.bots) == 0 {
		k.log("No bot available to destroy")
		return
	}

	bot := k.bots[len(k.bots)-1]
	k.bots = k.bots[:len(k.bots)-1]

	if bot.Order != nil {
		order := bot.Order
		bot.Order = nil
		bot.Status = Idle
		order.Status = Pending
		order.StartedAt = time.Time{}
		k.enqueue(order)
		k.log("Bot #%d destroyed while processing %s Order #%d - Order returned to PENDING", bot.ID, order.Kind, order.ID)
		k.assignIdleBots()
		return
	}

	k.log("Bot #%d destroyed while %s", bot.ID, bot.Status)
}

func (k *Kitchen) Logs() []string {
	k.mu.Lock()
	defer k.mu.Unlock()

	out := make([]string, len(k.logs))
	copy(out, k.logs)
	return out
}

// WaitUntilIdle blocks until the kitchen has no pending or processing orders.
func (k *Kitchen) WaitUntilIdle() {
	k.mu.Lock()
	defer k.mu.Unlock()

	for len(k.pending) > 0 || k.processingCount() > 0 {
		k.idle.Wait()
	}
}

func (k *Kitchen) Result() string {
	k.mu.Lock()
	defer k.mu.Unlock()

	lines := []string{"McDonald's Order Management System - Results", ""}
	lines = append(lines, k.logs...)
	lines = append(lines, "")
	lines = append(lines, "Final Status:")
	lines = append(lines, fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)", len(k.complete), k.completedCount(VIP), k.completedCount(Normal)))
	lines = append(lines, fmt.Sprintf("- Orders Completed: %d", len(k.complete)))
	lines = append(lines, fmt.Sprintf("- Active Bots: %d", len(k.bots)))
	lines = append(lines, fmt.Sprintf("- Pending Orders: %d", len(k.pending)))
	lines = append(lines, fmt.Sprintf("- Processing Orders: %d", k.processingCount()))

	return strings.Join(lines, "\n") + "\n"
}

func (k *Kitchen) PendingIDs() []int {
	k.mu.Lock()
	defer k.mu.Unlock()

	ids := make([]int, len(k.pending))
	for i, order := range k.pending {
		ids[i] = order.ID
	}
	return ids
}

func (k *Kitchen) CompletedIDs() []int {
	k.mu.Lock()
	defer k.mu.Unlock()

	ids := make([]int, len(k.complete))
	for i, order := range k.complete {
		ids[i] = order.ID
	}
	return ids
}

func (k *Kitchen) ProcessingOrders() map[int]int {
	k.mu.Lock()
	defer k.mu.Unlock()

	orders := make(map[int]int)
	for _, bot := range k.bots {
		if bot.Order != nil {
			orders[bot.ID] = bot.Order.ID
		}
	}
	return orders
}

func (k *Kitchen) BotCount() int {
	k.mu.Lock()
	defer k.mu.Unlock()

	return len(k.bots)
}

func (k *Kitchen) enqueue(order *Order) {
	order.Status = Pending
	k.pending = append(k.pending, order)
	sort.SliceStable(k.pending, func(i, j int) bool {
		if k.pending[i].Kind != k.pending[j].Kind {
			return k.pending[i].Kind == VIP
		}
		return k.pending[i].CreatedSeq < k.pending[j].CreatedSeq
	})
}

func (k *Kitchen) assignIdleBots() {
	for _, bot := range k.bots {
		if len(k.pending) == 0 {
			if bot.Order == nil && bot.Status != Idle {
				bot.Status = Idle
				k.log("Bot #%d is now %s - No pending orders", bot.ID, bot.Status)
			}
			continue
		}
		if bot.Order != nil {
			continue
		}

		order := k.pending[0]
		k.pending = k.pending[1:]
		order.Status = Processing
		order.StartedAt = time.Now()

		bot.Status = Active
		bot.Order = order

		k.log("Bot #%d picked up %s Order #%d - Status: %s", bot.ID, order.Kind, order.ID, order.Status)
		go k.processOrder(bot, order)
	}
}

func (k *Kitchen) processOrder(bot *Bot, order *Order) {
	time.Sleep(k.processingDuration)

	k.mu.Lock()
	defer k.mu.Unlock()
	defer k.notifyIfIdle()

	if bot.Order != order {
		return
	}

	k.completeOrder(bot)
	k.assignIdleBots()
}

func (k *Kitchen) completeOrder(bot *Bot) {
	order := bot.Order
	order.Status = Complete
	order.CompletedAt = time.Now()
	k.complete = append(k.complete, order)

	k.log("Bot #%d completed %s Order #%d - Status: %s (Processing time: 10s)", bot.ID, order.Kind, order.ID, order.Status)

	bot.Order = nil
	bot.Status = Idle
	if len(k.pending) == 0 {
		k.log("Bot #%d is now %s - No pending orders", bot.ID, bot.Status)
	}
}

func (k *Kitchen) completedCount(kind OrderKind) int {
	count := 0
	for _, order := range k.complete {
		if order.Kind == kind {
			count++
		}
	}
	return count
}

func (k *Kitchen) processingCount() int {
	count := 0
	for _, bot := range k.bots {
		if bot.Order != nil {
			count++
		}
	}
	return count
}

func (k *Kitchen) notifyIfIdle() {
	if len(k.pending) == 0 && k.processingCount() == 0 {
		k.idle.Broadcast()
	}
}

func (k *Kitchen) log(format string, args ...any) {
	k.logs = append(k.logs, fmt.Sprintf("[%s] %s", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...)))
}
