package main

import (
	"fmt"
	"sync"
	"time"
)

type OrderType int

const (
	NormalOrder OrderType = iota
	VIPOrder
)

type OrderStatus int

const (
	Pending OrderStatus = iota
	Processing
	Complete
)

type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}

func (o *Order) String() string {
	orderType := "Normal"
	if o.Type == VIPOrder {
		orderType = "VIP"
	}
	return fmt.Sprintf("%s#%d", orderType, o.ID)
}

type Bot struct {
	ID            int
	CurrentOrder  *Order
	IsProcessing  bool
	stopChan      chan struct{}
	completedChan chan *Order
}

type OrderController struct {
	mu          sync.Mutex
	orders      []*Order
	nextOrderID int
	bots        []*Bot
	nextBotID   int
	pendingQ    []*Order
}

func NewOrderController() *OrderController {
	return &OrderController{
		orders:      make([]*Order, 0),
		nextOrderID: 1,
		bots:        make([]*Bot, 0),
		nextBotID:   1,
		pendingQ:    make([]*Order, 0),
	}
}

func (oc *OrderController) AddNormalOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:     oc.nextOrderID,
		Type:   NormalOrder,
		Status: Pending,
	}
	oc.nextOrderID++
	oc.orders = append(oc.orders, order)
	oc.insertIntoPending(order)

	fmt.Printf("[%s] Added %s\n", time.Now().Format("15:04:05"), order)
	oc.printStatusNoLock()

	return order
}

func (oc *OrderController) AddVIPOrder() *Order {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order := &Order{
		ID:     oc.nextOrderID,
		Type:   VIPOrder,
		Status: Pending,
	}
	oc.nextOrderID++
	oc.orders = append(oc.orders, order)
	oc.insertIntoPending(order)

	fmt.Printf("[%s] Added %s\n", time.Now().Format("15:04:05"), order)
	oc.printStatusNoLock()

	return order
}

func (oc *OrderController) insertIntoPending(order *Order) {
	insertIdx := len(oc.pendingQ)
	for i, o := range oc.pendingQ {
		if o.Type == NormalOrder {
			insertIdx = i
			break
		}
	}

	if insertIdx == len(oc.pendingQ) {
		oc.pendingQ = append(oc.pendingQ, order)
	} else {
		oc.pendingQ = append(oc.pendingQ[:insertIdx], append([]*Order{order}, oc.pendingQ[insertIdx:]...)...)
	}
}

func (oc *OrderController) AddBot() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	bot := &Bot{
		ID:            oc.nextBotID,
		IsProcessing:  false,
		stopChan:      make(chan struct{}),
		completedChan: make(chan *Order, 1),
	}
	oc.nextBotID++
	oc.bots = append(oc.bots, bot)

	fmt.Printf("[%s] Added bot #%d\n", time.Now().Format("15:04:05"), bot.ID)
	oc.printStatusNoLock()

	oc.tryAssignOrderAsync(bot)

	return bot
}

func (oc *OrderController) RemoveBot() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) == 0 {
		fmt.Printf("[%s] No bots to remove\n", time.Now().Format("15:04:05"))
		return
	}

	lastBot := oc.bots[len(oc.bots)-1]
	oc.bots = oc.bots[:len(oc.bots)-1]

	if lastBot.IsProcessing && lastBot.CurrentOrder != nil {
		close(lastBot.stopChan)

		order := lastBot.CurrentOrder
		order.Status = Pending

		lastBot.IsProcessing = false
		lastBot.CurrentOrder = nil

		oc.insertIntoPending(order)
		fmt.Printf("[%s] Removed bot #%d (was processing %s, returned to pending)\n",
			time.Now().Format("15:04:05"), lastBot.ID, order)
	} else {
		fmt.Printf("[%s] Removed bot #%d (idle)\n", time.Now().Format("15:04:05"), lastBot.ID)
	}

	oc.printStatusNoLock()
}

func (oc *OrderController) tryAssignOrderAsync(bot *Bot) {
	go func() {
		for {
			var order *Order

			oc.mu.Lock()

			if len(oc.pendingQ) > 0 {
				order = oc.pendingQ[0]
				oc.pendingQ = oc.pendingQ[1:]

				order.Status = Processing
				bot.IsProcessing = true
				bot.CurrentOrder = order
			}

			oc.mu.Unlock()

			if order == nil {
				time.Sleep(100 * time.Millisecond)
				continue
			}

			fmt.Printf("[%s] Bot #%d started processing %s\n",
				time.Now().Format("15:04:05"), bot.ID, order)
			oc.printStatus()

			select {
			case <-time.After(10 * time.Second):
				oc.mu.Lock()
				order.Status = Complete
				bot.IsProcessing = false
				bot.CurrentOrder = nil
				oc.mu.Unlock()

				fmt.Printf("[%s] Bot #%d completed %s\n",
					time.Now().Format("15:04:05"), bot.ID, order)
				oc.printStatus()

			case <-bot.stopChan:
				fmt.Printf("[%s] Bot #%d stopped while processing %s\n",
					time.Now().Format("15:04:05"), bot.ID, order)
				return
			}
		}
	}()
}

func (oc *OrderController) printStatus() {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	oc.printStatusNoLock()
}

func (oc *OrderController) printStatusNoLock() {
	botCount := len(oc.bots)

	var pendingOrders []string
	for _, order := range oc.pendingQ {
		pendingOrders = append(pendingOrders, order.String())
	}

	var processingOrders []string
	for _, bot := range oc.bots {
		if bot.IsProcessing && bot.CurrentOrder != nil {
			processingOrders = append(processingOrders, bot.CurrentOrder.String())
		}
	}

	allOrders := append(pendingOrders, processingOrders...)

	if len(allOrders) == 0 {
		fmt.Printf("[%s] status: bot: [%d], order: []\n",
			time.Now().Format("15:04:05"), botCount)
	} else {
		fmt.Printf("[%s] status: bot: [%d], order: [%s]\n",
			time.Now().Format("15:04:05"), botCount, joinStrings(allOrders))
	}
}

func joinStrings(strs []string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += ", " + strs[i]
	}
	return result
}

func (oc *OrderController) GetPendingCount() int {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	return len(oc.pendingQ)
}

func (oc *OrderController) GetBotCount() int {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	return len(oc.bots)
}

func (oc *OrderController) GetCompletedCount() int {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	count := 0
	for _, order := range oc.orders {
		if order.Status == Complete {
			count++
		}
	}
	return count
}
