package order

import (
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
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID           int
	Type         OrderType
	Status       OrderStatus
	CreatedAt    time.Time
	UpdatedAt    time.Time
	ProcessingAt time.Time
}

type Bot struct {
	ID         int
	isActive   bool
	isIdle     bool
	stopChan   chan bool
	wg         *sync.WaitGroup
	controller *OrderController
}

type OrderController struct {
	orders        []*Order
	pendingVIP    []*Order
	pendingNormal []*Order
	completed     []*Order
	bots          []*Bot
	nextOrderID   int
	nextBotID     int
	mu            sync.Mutex
	output        func(format string, args ...interface{})
}

func (ot OrderType) DisplayString() string {
	if ot == Normal {
		return "Normal"
	}
	return "VIP"
}

func NewOrderController(outputFunc func(format string, args ...interface{})) *OrderController {
	oc := &OrderController{
		orders:        []*Order{},
		pendingVIP:    []*Order{},
		pendingNormal: []*Order{},
		completed:     []*Order{},
		bots:          []*Bot{},
		nextOrderID:   1001,
		nextBotID:     1,
		output:        outputFunc,
	}
	oc.output("[%s] System initialized with 0 bots", formatTime(time.Now()))
	return oc
}

func (oc *OrderController) AddNormalOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:        oc.nextOrderID,
		Type:      Normal,
		Status:    Pending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	oc.nextOrderID++
	oc.orders = append(oc.orders, order)
	oc.pendingNormal = append(oc.pendingNormal, order)

	oc.output("[%s] Created Normal Order #%d - Status: PENDING", formatTime(time.Now()), order.ID)
	return order
}

func (oc *OrderController) AddVIPOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:        oc.nextOrderID,
		Type:      VIP,
		Status:    Pending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	oc.nextOrderID++
	oc.orders = append(oc.orders, order)
	oc.pendingVIP = append(oc.pendingVIP, order)

	oc.output("[%s] Created VIP Order #%d - Status: PENDING", formatTime(time.Now()), order.ID)
	return order
}

func (oc *OrderController) AddBot() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	bot := &Bot{
		ID:         oc.nextBotID,
		isActive:   true,
		isIdle:     true,
		stopChan:   make(chan bool, 1),
		wg:         &sync.WaitGroup{},
		controller: oc,
	}
	oc.nextBotID++
	oc.bots = append(oc.bots, bot)

	oc.output("[%s] Bot #%d created - Status: ACTIVE", formatTime(time.Now()), bot.ID)

	bot.wg.Add(1)
	go bot.run()
	return bot
}

func (oc *OrderController) RemoveBot() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) == 0 {
		return
	}

	bot := oc.bots[len(oc.bots)-1]
	oc.bots = oc.bots[:len(oc.bots)-1]

	if bot.isIdle {
		oc.output("[%s] Bot #%d destroyed while IDLE", formatTime(time.Now()), bot.ID)
	} else {
		oc.output("[%s] Bot #%d destroyed", formatTime(time.Now()), bot.ID)
	}

	bot.stopChan <- true
	bot.isActive = false

	oc.mu.Unlock()
	bot.wg.Wait()
	close(bot.stopChan)
	oc.mu.Lock()
}

func (oc *OrderController) getNextPendingOrder() *Order {
	if len(oc.pendingVIP) > 0 {
		order := oc.pendingVIP[0]
		oc.pendingVIP = oc.pendingVIP[1:]
		return order
	}
	if len(oc.pendingNormal) > 0 {
		order := oc.pendingNormal[0]
		oc.pendingNormal = oc.pendingNormal[1:]
		return order
	}
	return nil
}

func (oc *OrderController) returnOrderToPending(order *Order) {
	order.Status = Pending
	order.UpdatedAt = time.Now()
	if order.Type == VIP {
		oc.pendingVIP = append([]*Order{order}, oc.pendingVIP...)
	} else {
		oc.pendingNormal = append([]*Order{order}, oc.pendingNormal...)
	}
}

func (oc *OrderController) completeOrder(order *Order) {
	order.Status = Complete
	order.UpdatedAt = time.Now()
	oc.completed = append(oc.completed, order)
}

func (oc *OrderController) hasPendingOrders() bool {
	return len(oc.pendingVIP) > 0 || len(oc.pendingNormal) > 0
}

func (oc *OrderController) PrintStatus() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	pendingOrders := append(oc.pendingVIP, oc.pendingNormal...)
	botIDs := make([]int, 0, len(oc.bots))
	for _, bot := range oc.bots {
		botIDs = append(botIDs, bot.ID)
	}

	orderIDs := make([]int, 0, len(pendingOrders))
	for _, order := range pendingOrders {
		orderIDs = append(orderIDs, order.ID)
	}

	oc.output("[%s] STATUS - Active Bots: %v, Pending Orders: %v", formatTime(time.Now()), botIDs, orderIDs)
}

func (oc *OrderController) PrintFinalStatus() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	vipCompleted := 0
	normalCompleted := 0
	for _, order := range oc.completed {
		if order.Type == VIP {
			vipCompleted++
		} else {
			normalCompleted++
		}
	}

	activeBots := 0
	for _, bot := range oc.bots {
		if bot.isActive {
			activeBots++
		}
	}

	pendingCount := len(oc.pendingVIP) + len(oc.pendingNormal)

	oc.output("")
	oc.output("Final Status:")
	oc.output("- Total Orders Processed: %d (%d VIP, %d Normal)", len(oc.completed), vipCompleted, normalCompleted)
	oc.output("- Orders Completed: %d", len(oc.completed))
	oc.output("- Active Bots: %d", activeBots)
	oc.output("- Pending Orders: %d", pendingCount)
}

func (bot *Bot) run() {
	defer bot.wg.Done()

	for {
		select {
		case <-bot.stopChan:
			return
		default:
			if !bot.isActive {
				return
			}

			bot.controller.mu.Lock()
			order := bot.controller.getNextPendingOrder()
			if order == nil {
				if !bot.isIdle {
					bot.isIdle = true
					if bot.controller.hasPendingOrders() {
						// Do nothing, just continue loop to check again
					} else {
						bot.controller.output("[%s] Bot #%d is now IDLE - No pending orders", formatTime(time.Now()), bot.ID)
					}
				}
				bot.controller.mu.Unlock()
				time.Sleep(100 * time.Millisecond)
				continue
			}
			bot.isIdle = false
			order.Status = Processing
			order.ProcessingAt = time.Now()
			bot.controller.output("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING", formatTime(time.Now()), bot.ID, order.Type.DisplayString(), order.ID)
			bot.controller.mu.Unlock()

			timer := time.NewTimer(10 * time.Second)

			select {
			case <-timer.C:
				bot.controller.mu.Lock()
				if bot.isActive {
					bot.controller.completeOrder(order)
					bot.controller.output("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", formatTime(time.Now()), bot.ID, order.Type.DisplayString(), order.ID)
					bot.isIdle = true
				}
				bot.controller.mu.Unlock()
			case <-bot.stopChan:
				timer.Stop()
				bot.controller.mu.Lock()
				bot.controller.returnOrderToPending(order)
				bot.controller.output("[%s] Order #%d returned to PENDING area due to bot #%d removal", formatTime(time.Now()), order.ID, bot.ID)
				bot.controller.mu.Unlock()
				return
			}
		}
	}
}

func formatTime(t time.Time) string {
	return t.Format("15:04:05")
}
