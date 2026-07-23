package order

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

// ---------------------------------------------------------
// Enumerations and Basic Data Structures
// ---------------------------------------------------------

type OrderType int

const (
	OrderTypeNormal OrderType = iota
	OrderTypeVIP
)

func (t OrderType) String() string {
	if t == OrderTypeVIP {
		return "VIP"
	}
	return "Normal"
}

type OrderStatus int

const (
	StatusPending OrderStatus = iota
	StatusProcessing
	StatusCompleted
)

func (s OrderStatus) String() string {
	switch s {
	case StatusPending:
		return "PENDING"
	case StatusProcessing:
		return "PROCESSING"
	case StatusCompleted:
		return "COMPLETE"
	default:
		return "UNKNOWN"
	}
}

type Order struct {
	ID            int
	Type          OrderType
	Status        OrderStatus
	AssignedBotID int
}

type Bot struct {
	ID          int
	IsIdle      bool
	interruptCh chan struct{}
}

// Assign marks the bot as busy and initializes the interrupt channel
func (b *Bot) Assign() {
	b.IsIdle = false
	b.interruptCh = make(chan struct{})
}

// Destroy triggers the interrupt signal to stop the cooking task
func (b *Bot) Destroy() {
	if !b.IsIdle && b.interruptCh != nil {
		close(b.interruptCh)
	}
}

type BotResult struct {
	BotID     int
	Ord       *Order
	Completed bool
}

// ---------------------------------------------------------
// Core Controller
// ---------------------------------------------------------

type Controller struct {
	state StateSnapshot // Explicit state snapshot field

	queue       *OrderQueue
	nextOrderID int
	bots        []*Bot
	nextBotID   int

	cmdCh  chan Command
	stopCh chan struct{}

	wg sync.WaitGroup
	stopOnce sync.Once

	cookDuration time.Duration
}

func NewController() *Controller {
	c := &Controller{
		queue:        NewOrderQueue(),
		nextOrderID:  1001,
		nextBotID:    1,
		cmdCh:        make(chan Command),
		stopCh:       make(chan struct{}),
		cookDuration: 10 * time.Second,
	}
	c.start()
	return c
}

// ---------------------------------------------------------
// Exposed API (Blocking Send Interface with Context)
// ---------------------------------------------------------

func (c *Controller) Send(ctx context.Context, cmd Command) Response {
	replyCh := make(chan Response, 1)
	cmd.ReplyCh = replyCh
	select {
	case c.cmdCh <- cmd:
	case <-c.stopCh:
		return Response{Err: fmt.Errorf("controller stopped")}
	case <-ctx.Done():
		return Response{Err: ctx.Err()}
	}
	select {
	case response := <-replyCh:
		return response
	case <-c.stopCh:
		return Response{Err: errors.New("controller has stopped")}
	case <-ctx.Done():
		return Response{Err: ctx.Err()}
	}
}

func (c *Controller) Stop() {
	c.stopOnce.Do(func() { close(c.stopCh) })
	c.wg.Wait()
}

func (c *Controller) logf(format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	fmt.Printf("[%s] %s\n", time.Now().Format("15:04:05"), msg)
}

func (c *Controller) emit(ev Event) {
	if ev.Timestamp.IsZero() {
		ev.Timestamp = time.Now()
	}
	c.logf("%s", ev.Message)
}

// ---------------------------------------------------------
// Dispatch Logic (Explicit Event Driven)
// ---------------------------------------------------------

func (c *Controller) start() {
	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		c.logf("System initialized with %d bots", len(c.bots))

		for {
			select {
			case <-c.stopCh:
				return

			case cmd := <-c.cmdCh:
				c.handleCommand(cmd)
			}
		}
	}()
}

func (c *Controller) handleCommand(cmd Command) {
	var replyVal Response

	switch cmd.Type {
	case CreateNormalOrder:
		c.onCreateNormalOrder()
	case CreateVIPOrder:
		c.onCreateVIPOrder()
	case AddBotCommand:
		c.onAddBot()
	case RemoveBotCommand:
		replyVal.Err = c.onRemoveBot()
	case BotDoneCommand:
		replyVal.Err = c.onBotDone(cmd.Payload)
	case StatusCommand:
		c.onStatusCommand()
	case GetStateCommand:
		replyVal.State = c.onGetState()
	}

	if cmd.ReplyCh != nil {
		cmd.ReplyCh <- replyVal
	}
}

// ---------------------------------------------------------
// Private Business Functions for Commands
// ---------------------------------------------------------

func (c *Controller) createOrder(orderType OrderType) {
	ord := &Order{
		ID:     c.nextOrderID,
		Type:   orderType,
		Status: StatusPending,
	}
	c.nextOrderID++
	c.queue.Push(ord)
	c.emit(Event{
		Type:    "OrderCreated",
		OrderID: ord.ID,
		Message: fmt.Sprintf("Created %s Order #%d - Status: %s", orderType, ord.ID, ord.Status),
	})
	c.dispatch()
}

func (c *Controller) emitIfIdle(b *Bot) {
	if b != nil && b.IsIdle {
		c.emit(Event{
			Type:    "BotIdle",
			BotID:   b.ID,
			Message: fmt.Sprintf("Bot #%d is now IDLE - No pending orders", b.ID),
		})
	}
}

func (c *Controller) onCreateNormalOrder() {
	c.createOrder(OrderTypeNormal)
}

func (c *Controller) onCreateVIPOrder() {
	c.createOrder(OrderTypeVIP)
}

func (c *Controller) onAddBot() {
	b := &Bot{ID: c.nextBotID, IsIdle: true}
	c.nextBotID++
	c.bots = append(c.bots, b)
	c.emit(Event{
		Type:    "BotCreated",
		BotID:   b.ID,
		Message: fmt.Sprintf("Bot #%d created - Status: ACTIVE", b.ID),
	})
	c.dispatch()
	c.emitIfIdle(b)
}

func (c *Controller) onRemoveBot() error {
	if len(c.bots) == 0 {
		c.emit(Event{
			Type:    "Error",
			Message: "No bots available to remove",
		})
		return fmt.Errorf("no bots available to remove")
	}

	lastBot := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]

	lastBot.Destroy()
	if !lastBot.IsIdle {
		c.emit(Event{
			Type:    "BotDestroyed",
			BotID:   lastBot.ID,
			Message: fmt.Sprintf("Bot #%d destroyed while processing", lastBot.ID),
		})
	} else {
		c.emit(Event{
			Type:    "BotDestroyed",
			BotID:   lastBot.ID,
			Message: fmt.Sprintf("Bot #%d destroyed while IDLE", lastBot.ID),
		})
	}
	return nil
}

func (c *Controller) onBotDone(payload any) error {
	res, ok := payload.(BotResult)
	if !ok {
		return fmt.Errorf("invalid payload type for BotDoneCommand, expected BotResult")
	}

	if res.Completed {
		c.state.Completed++
		if res.Ord.Type == OrderTypeVIP {
			c.state.CompletedVIP++
		} else {
			c.state.CompletedNorm++
		}

		res.Ord.Status = StatusCompleted
		res.Ord.AssignedBotID = 0

		c.emit(Event{
			Type:    "OrderCompleted",
			OrderID: res.Ord.ID,
			BotID:   res.BotID,
			Message: fmt.Sprintf("Bot #%d completed %s Order #%d - Status: %s (Processing time: 10s)",
				res.BotID, res.Ord.Type, res.Ord.ID, res.Ord.Status),
		})

		targetBot := c.findBotByID(res.BotID)
		if targetBot != nil {
			targetBot.IsIdle = true
		}
		c.dispatch()
		c.emitIfIdle(targetBot)
	} else {
		res.Ord.Status = StatusPending
		res.Ord.AssignedBotID = 0

		c.emit(Event{
			Type:    "OrderInterrupted",
			OrderID: res.Ord.ID,
			BotID:   res.BotID,
			Message: fmt.Sprintf("%s Order #%d returned to queue - Status: %s",
				res.Ord.Type, res.Ord.ID, res.Ord.Status),
		})

		c.queue.PushFront(res.Ord)
		c.dispatch()
	}
	return nil
}

func (c *Controller) onStatusCommand() {
	state := c.onGetState()
	pending := state.VipQueueLen + state.NormQueueLen
	processing := state.BotsCount - state.IdleBots

	c.emit(Event{
		Type: "StatusReport",
		Message: fmt.Sprintf("Status: bots=%d, pending=%d, processing=%d, completed=%d",
			state.BotsCount, pending, processing, state.Completed),
	})
}

func (c *Controller) onGetState() StateSnapshot {
	idleBots := 0
	for _, b := range c.bots {
		if b.IsIdle {
			idleBots++
		}
	}
	return StateSnapshot{
		BotsCount:     len(c.bots),
		VipQueueLen:   c.queue.VIPLen(),
		NormQueueLen:  c.queue.NormLen(),
		IdleBots:      idleBots,
		Completed:     c.state.Completed,
		CompletedVIP:  c.state.CompletedVIP,
		CompletedNorm: c.state.CompletedNorm,
	}
}

func (c *Controller) PrintFinalStats() {
	state := c.Send(context.Background(), Command{Type: GetStateCommand}).State

	fmt.Println()
	fmt.Println("Final Status:")
	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", state.Completed, state.CompletedVIP, state.CompletedNorm)
	fmt.Printf("- Orders Completed: %d\n", state.Completed)
	fmt.Printf("- Active Bots: %d\n", state.BotsCount)
	fmt.Printf("- Pending Orders: %d\n", state.VipQueueLen+state.NormQueueLen)
}

// ---------------------------------------------------------
// Internal Auxiliary Functions
// ---------------------------------------------------------

func (c *Controller) findBotByID(botID int) *Bot {
	for _, b := range c.bots {
		if b.ID == botID {
			return b
		}
	}
	return nil
}

func (c *Controller) findIdleBot() *Bot {
	for _, b := range c.bots {
		if b.IsIdle {
			return b
		}
	}
	return nil
}

func (c *Controller) dispatch() {
	for c.queue.Len() > 0 {
		idleBot := c.findIdleBot()
		if idleBot == nil {
			break
		}

		ord, ok := c.queue.Pop()
		if !ok || ord == nil {
			break
		}
		ord.Status = StatusProcessing
		ord.AssignedBotID = idleBot.ID

		idleBot.Assign()

		c.emit(Event{
			Type:    "OrderPickedUp",
			OrderID: ord.ID,
			BotID:   idleBot.ID,
			Message: fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: %s", idleBot.ID, ord.Type, ord.ID, ord.Status),
		})

		c.wg.Add(1)
		go func() {
			defer c.wg.Done()
			c.cook(c.stopCh, idleBot.interruptCh, idleBot.ID, ord)
		}()
	}
}

func (c *Controller) cook(stopCh <-chan struct{}, interruptCh <-chan struct{}, botID int, ord *Order) {
	select {
	case <-time.After(c.cookDuration):
		select {
		case c.cmdCh <- Command{Type: BotDoneCommand, Payload: BotResult{BotID: botID, Ord: ord, Completed: true}}:
		case <-stopCh:
		}
	case <-interruptCh:
		select {
		case c.cmdCh <- Command{Type: BotDoneCommand, Payload: BotResult{BotID: botID, Ord: ord, Completed: false}}:
		case <-stopCh:
		}
	case <-stopCh:
	}
}
