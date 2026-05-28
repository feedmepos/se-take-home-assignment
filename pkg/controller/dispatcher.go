package controller

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

type orderEvent struct {
	botID int
	order *Order
}

type Dispatcher struct {
	// Channels for actor loop
	addOrderChan       chan *Order
	registerBotChan    chan *Bot
	unregisterBotChan  chan int
	botIdleChan        chan *Bot
	scaleUpChan        chan struct{}
	scaleDownChan      chan struct{}
	orderStartChan     chan orderEvent
	orderCompleteChan  chan orderEvent
	orderInterruptChan chan orderEvent
	stopChan           chan struct{}

	// System state (only modified/read within the run goroutine)
	queue        *OrderQueue
	activeBots   map[int]*Bot
	idleBotsList []*Bot
	botIDCounter int
	orderCounter int
	cookDuration time.Duration

	// Thread-safe stats/logs (for external CLI and status checks)
	statusMu     sync.RWMutex
	allOrders    map[int]*Order
	botList      []*Bot
	logBuffer    []string
	OnLogWritten func()
}

func NewDispatcher(cookDuration time.Duration) *Dispatcher {
	return &Dispatcher{
		addOrderChan:       make(chan *Order, 100),
		registerBotChan:    make(chan *Bot, 100),
		unregisterBotChan:  make(chan int, 100),
		botIdleChan:        make(chan *Bot, 100),
		scaleUpChan:        make(chan struct{}, 100),
		scaleDownChan:      make(chan struct{}, 100),
		orderStartChan:     make(chan orderEvent, 100),
		orderCompleteChan:  make(chan orderEvent, 100),
		orderInterruptChan: make(chan orderEvent, 100),
		stopChan:           make(chan struct{}),
		queue:              NewOrderQueue(),
		activeBots:         make(map[int]*Bot),
		idleBotsList:       make([]*Bot, 0),
		orderCounter:       1000, // Start order ID at 1000 as in result.txt example
		cookDuration:       cookDuration,
		allOrders:          make(map[int]*Order),
		botList:            make([]*Bot, 0),
		logBuffer:          make([]string, 0),
	}
}

// Start runs the central dispatcher event loop.
func (d *Dispatcher) Start(ctx context.Context) {
	d.Log("System initialized with %d bots", len(d.activeBots))

	for {
		select {
		case <-ctx.Done():
			d.cleanup()
			return
		case <-d.stopChan:
			d.cleanup()
			return

		case order := <-d.addOrderChan:
			d.orderCounter++
			order.ID = d.orderCounter
			d.queue.Push(order)
			d.updateOrderState(order)
			d.Log("Created %s Order #%d - Status: PENDING", order.Type, order.ID)
			d.dispatch()

		case bot := <-d.registerBotChan:
			d.activeBots[bot.ID] = bot
			d.updateBotList()
			d.Log("Bot #%d created - Status: ACTIVE", bot.ID)

		case botID := <-d.unregisterBotChan:
			// Bot has finished exiting, remove it from dispatcher trackers
			delete(d.activeBots, botID)
			d.removeFromIdleList(botID)
			d.updateBotList()

		case bot := <-d.botIdleChan:
			// Bot finished a task or initialized, register it as idle
			// Ensure bot hasn't been cancelled/removed in the meantime
			if _, exists := d.activeBots[bot.ID]; exists {
				d.idleBotsList = append(d.idleBotsList, bot)
				d.Log("Bot #%d is now IDLE - No pending orders", bot.ID)
				d.dispatch()
			}

		case <-d.scaleUpChan:
			d.botIDCounter++
			botCtx, botCancel := context.WithCancel(ctx)
			bot := NewBot(d.botIDCounter, botCtx, botCancel, d.cookDuration)
			go bot.Run(d)

		case <-d.scaleDownChan:
			// Find the newest bot (highest ID)
			var newestBot *Bot
			for _, b := range d.activeBots {
				if newestBot == nil || b.ID > newestBot.ID {
					newestBot = b
				}
			}
			if newestBot != nil {
				// Log destruction first before it unregisters
				activeOrder := newestBot.GetActiveOrder()
				if activeOrder != nil {
					d.Log("Bot #%d destroyed while processing Order #%d", newestBot.ID, activeOrder.ID)
				} else {
					d.Log("Bot #%d destroyed while IDLE", newestBot.ID)
				}
				newestBot.Cancel()
				delete(d.activeBots, newestBot.ID)
				d.removeFromIdleList(newestBot.ID)
				d.updateBotList()
			}

		case ev := <-d.orderStartChan:
			ev.order.Status = StatusProcessing
			d.updateOrderState(ev.order)
			d.Log("Bot #%d picked up %s Order #%d - Status: PROCESSING", ev.botID, ev.order.Type, ev.order.ID)

		case ev := <-d.orderCompleteChan:
			ev.order.Status = StatusComplete
			d.updateOrderState(ev.order)
			// e.g., Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)
			sec := int(d.cookDuration.Seconds())
			d.Log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)", ev.botID, ev.order.Type, ev.order.ID, sec)

		case ev := <-d.orderInterruptChan:
			ev.order.Status = StatusPending
			d.updateOrderState(ev.order)
			// Return order back to queue
			d.queue.Push(ev.order)
			d.Log("Order #%d processing interrupted - Status: PENDING", ev.order.ID)
			d.dispatch()
		}
	}
}

// Stop stops the dispatcher.
func (d *Dispatcher) Stop() {
	close(d.stopChan)
}

// External safe actions
func (d *Dispatcher) AddOrder(orderType OrderType) {
	d.addOrderChan <- &Order{
		Type:      orderType,
		Status:    StatusPending,
		CreatedAt: time.Now(),
	}
}

func (d *Dispatcher) ScaleUp() {
	d.scaleUpChan <- struct{}{}
}

func (d *Dispatcher) ScaleDown() {
	d.scaleDownChan <- struct{}{}
}

// Callback updates from Bot processes
func (d *Dispatcher) RegisterBot(bot *Bot) {
	d.registerBotChan <- bot
}

func (d *Dispatcher) UnregisterBot(botID int) {
	d.unregisterBotChan <- botID
}

func (d *Dispatcher) OnOrderStart(botID int, order *Order) {
	d.orderStartChan <- orderEvent{botID: botID, order: order}
}

func (d *Dispatcher) OnOrderComplete(botID int, order *Order) {
	d.orderCompleteChan <- orderEvent{botID: botID, order: order}
}

func (d *Dispatcher) OnOrderInterrupt(botID int, order *Order) {
	d.orderInterruptChan <- orderEvent{botID: botID, order: order}
}

// Internal dispatcher logic
func (d *Dispatcher) dispatch() {
	// Match pending orders with idle bots
	for d.queue.Len() > 0 && len(d.idleBotsList) > 0 {
		order := d.queue.Pop()
		if order == nil {
			break
		}

		bot := d.idleBotsList[0]
		d.idleBotsList = d.idleBotsList[1:]

		select {
		case bot.Jobs <- order:
			// Successfully sent to bot
		case <-bot.Ctx.Done():
			// Bot got cancelled before accepting the job, put order back
			d.queue.Push(order)
		}
	}
}

func (d *Dispatcher) removeFromIdleList(botID int) {
	for i, b := range d.idleBotsList {
		if b.ID == botID {
			d.idleBotsList = append(d.idleBotsList[:i], d.idleBotsList[i+1:]...)
			break
		}
	}
}

func (d *Dispatcher) cleanup() {
	for _, b := range d.activeBots {
		b.Cancel()
	}
	d.activeBots = make(map[int]*Bot)
	d.idleBotsList = make([]*Bot, 0)
	d.updateBotList()
}

// Thread-safe log and status updates
func (d *Dispatcher) Log(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	timestamp := time.Now().Format("15:04:05")
	logMsg := fmt.Sprintf("[%s] %s", timestamp, msg)

	d.statusMu.Lock()
	d.logBuffer = append(d.logBuffer, logMsg)
	d.statusMu.Unlock()

	// If a custom callback is provided (e.g. for split-screen dashboard), call it.
	// Otherwise, print directly to the console.
	if d.OnLogWritten != nil {
		d.OnLogWritten()
	} else {
		fmt.Println(logMsg)
	}
}

func (d *Dispatcher) updateOrderState(order *Order) {
	d.statusMu.Lock()
	defer d.statusMu.Unlock()
	d.allOrders[order.ID] = order
}

func (d *Dispatcher) updateBotList() {
	d.statusMu.Lock()
	defer d.statusMu.Unlock()
	list := make([]*Bot, 0, len(d.activeBots))
	for _, b := range d.activeBots {
		list = append(list, b)
	}
	d.botList = list
}

// Thread-safe status getters (for CLI display)
func (d *Dispatcher) GetLogs() []string {
	d.statusMu.RLock()
	defer d.statusMu.RUnlock()
	copied := make([]string, len(d.logBuffer))
	copy(copied, d.logBuffer)
	return copied
}

func (d *Dispatcher) GetStatus() (activeBots int, pendingOrders []*Order, processingOrders []*Order, completedOrders []*Order) {
	d.statusMu.RLock()
	defer d.statusMu.RUnlock()

	activeBots = len(d.botList)

	// Get pending orders directly from the priority queue to maintain exact order
	pendingOrders = d.queue.GetPending()

	// Classify and sort other tracking orders
	for _, o := range d.allOrders {
		switch o.Status {
		case StatusProcessing:
			processingOrders = append(processingOrders, o)
		case StatusComplete:
			completedOrders = append(completedOrders, o)
		}
	}

	// Sort processing and completed orders by ID ascending for determinism in checks
	sort.Slice(processingOrders, func(i, j int) bool {
		return processingOrders[i].ID < processingOrders[j].ID
	})
	sort.Slice(completedOrders, func(i, j int) bool {
		return completedOrders[i].ID < completedOrders[j].ID
	})

	return
}
