package controller

import (
	"context"
	"fmt"
	"io"
	"slices"
	"time"
)

var processingDuration = 10 * time.Second

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

type OrderStatus string

const (
	OrderPending    OrderStatus = "PENDING"
	OrderProcessing OrderStatus = "PROCESSING"
	OrderComplete   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	BotIdle       BotStatus = "IDLE"
	BotProcessing BotStatus = "PROCESSING"
)

type Order struct {
	ID     int
	Type   OrderType
	Status OrderStatus
}

type Bot struct {
	ID            int
	Status        BotStatus
	CurrentOrder  *Order
	cancelCooking context.CancelFunc
}

type Snapshot struct {
	Pending   []Order
	Completed []Order
	Bots      []Bot
}

// Controller 通过 commands channel 串行化所有状态变更。
// pending 队列和 bot 列表只会在 run 这个 goroutine 里读写，因此不需要 mutex。
type Controller struct {
	commands    chan command
	done        chan struct{}
	logWriter   io.Writer
	pending     []Order
	completed   []Order
	bots        []Bot
	nextOrderID int
	nextBotID   int
}

type commandKind int

const (
	cmdNewOrder commandKind = iota
	cmdAddBot
	cmdRemoveBot
	cmdCompleteOrder
	cmdSnapshot
	cmdStop
)

type command struct {
	kind    commandKind
	orderTy OrderType
	botID   int
	orderID int
	reply   chan response
}

type response struct {
	order    *Order
	bot      *Bot
	snapshot Snapshot
}

func NewController(logWriter io.Writer) *Controller {
	c := &Controller{
		commands:    make(chan command),
		done:        make(chan struct{}),
		logWriter:   logWriter,
		nextOrderID: 1,
		nextBotID:   1,
	}
	go c.run()
	return c
}

func (c *Controller) NewOrder(orderType OrderType) *Order {
	reply := make(chan response)
	c.commands <- command{kind: cmdNewOrder, orderTy: orderType, reply: reply}
	return (<-reply).order
}

func (c *Controller) AddBot() *Bot {
	reply := make(chan response)
	c.commands <- command{kind: cmdAddBot, reply: reply}
	return (<-reply).bot
}

func (c *Controller) RemoveBot() *Bot {
	reply := make(chan response)
	c.commands <- command{kind: cmdRemoveBot, reply: reply}
	return (<-reply).bot
}

func (c *Controller) Snapshot() Snapshot {
	reply := make(chan response)
	c.commands <- command{kind: cmdSnapshot, reply: reply}
	return (<-reply).snapshot
}

func (c *Controller) Stop() {
	reply := make(chan response)
	c.commands <- command{kind: cmdStop, reply: reply}
	<-reply
	close(c.done)
}

// run 是 controller 的状态中心。外部 API 和订单制作 goroutine 都只发送命令，
// 真正修改订单、队列、bot 状态的逻辑都收敛在这里。
func (c *Controller) run() {
	for cmd := range c.commands {
		switch cmd.kind {
		case cmdNewOrder:
			order := Order{
				ID:     c.nextOrderID,
				Type:   cmd.orderTy,
				Status: OrderPending,
			}
			c.nextOrderID++
			c.addPendingOrder(order)
			c.log("%s Order #%d created - Status: PENDING", order.Type, order.ID)
			c.dispatchOrders()
			cmd.reply <- response{order: copyOrder(order)}

		case cmdAddBot:
			bot := Bot{ID: c.nextBotID, Status: BotIdle}
			c.nextBotID++
			c.bots = append(c.bots, bot)
			c.log("Bot #%d created - Status: ACTIVE", bot.ID)
			c.dispatchOrders()
			created := findBot(c.bots, bot.ID)
			cmd.reply <- response{bot: copyBot(created)}

		case cmdRemoveBot:
			if len(c.bots) == 0 {
				cmd.reply <- response{}
				continue
			}
			// 作业要求删除“最后一个 bot”。如果它正在制作订单，需要把订单退回 pending 队列。
			removed := c.bots[len(c.bots)-1]
			c.bots = c.bots[:len(c.bots)-1]
			if removed.Status == BotProcessing {
				if removed.cancelCooking != nil {
					removed.cancelCooking()
				}
				if removed.CurrentOrder != nil {
					order := *removed.CurrentOrder
					order.Status = OrderPending
					c.addPendingOrder(order)
					c.log("Bot #%d canceled %s Order #%d", removed.ID, order.Type, order.ID)
					c.log("Bot #%d destroyed while PROCESSING - %s Order #%d returned to PENDING", removed.ID, order.Type, order.ID)
				} else {
					c.log("Bot #%d destroyed while PROCESSING but had no current order", removed.ID)
				}
			} else {
				c.log("Bot #%d destroyed while IDLE", removed.ID)
			}
			cmd.reply <- response{bot: copyBot(&removed)}

		case cmdCompleteOrder:
			bot := findBot(c.bots, cmd.botID)
			if bot == nil || bot.Status != BotProcessing || bot.CurrentOrder == nil || bot.CurrentOrder.ID != cmd.orderID {
				continue
			}
			order := *bot.CurrentOrder
			order.Status = OrderComplete
			c.completed = append(c.completed, order)
			c.log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", bot.ID, order.Type, order.ID)
			bot.Status = BotIdle
			bot.CurrentOrder = nil
			bot.cancelCooking = nil
			c.dispatchOrders()
			// dispatchOrders 可能会立刻把下一单分配给这个 bot，所以这里要重新检查它是否仍然 idle。
			if bot.Status == BotIdle && len(c.pending) == 0 {
				c.log("Bot #%d is now IDLE - No pending orders", bot.ID)
			}

		case cmdSnapshot:
			// 返回快照时复制 slice，避免外部拿到内部状态的引用后误改 controller 状态。
			cmd.reply <- response{snapshot: Snapshot{
				Pending:   append([]Order(nil), c.pending...),
				Completed: append([]Order(nil), c.completed...),
				Bots:      copyBots(c.bots),
			}}

		case cmdStop:
			for i := range c.bots {
				if c.bots[i].cancelCooking != nil {
					c.bots[i].cancelCooking()
				}
			}
			cmd.reply <- response{}
			return
		}
	}
}

// dispatchOrders 尽可能把 pending 订单派给空闲 bot。
// pending 队列已经按优先级排序，因此每次从队首取单即可。
func (c *Controller) dispatchOrders() {
	for len(c.pending) > 0 {
		bot := firstIdleBot(c.bots)
		if bot == nil {
			return
		}
		order := c.popNextOrder()
		order.Status = OrderProcessing
		bot.Status = BotProcessing
		bot.CurrentOrder = copyOrder(order)
		ctx, cancel := context.WithCancel(context.Background())
		bot.cancelCooking = cancel
		c.log("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, order.Type, order.ID)
		c.makeOrder(ctx, bot.ID, order.ID)
	}
}

// makeOrder 模拟真实的订单制作过程。
// 制作耗时不放在 run 里等待，否则 controller 就无法继续处理新订单、加 bot、删 bot 等命令。
// 制作完成后只发回 cmdCompleteOrder，由 run 统一判断这次完成事件是否仍然有效。
func (c *Controller) makeOrder(ctx context.Context, botID, orderID int) {
	go func() {
		timer := time.NewTimer(processingDuration)
		defer timer.Stop()
		select {
		case <-timer.C:
			select {
			case c.commands <- command{kind: cmdCompleteOrder, botID: botID, orderID: orderID}:
			case <-c.done:
			case <-ctx.Done():
			}
		case <-ctx.Done():
		case <-c.done:
		}
	}()
}

// addPendingOrder 将订单插入单一 pending 队列，保持 VIP 优先，同类型按 ID 升序。
func (c *Controller) addPendingOrder(order Order) {
	c.pending = append(c.pending, order)
	slices.SortStableFunc(c.pending, comparePendingOrders)
}

func comparePendingOrders(a, b Order) int {
	if a.Type != b.Type {
		if a.Type == VIP {
			return -1
		}
		return 1
	}
	if a.ID < b.ID {
		return -1
	}
	if a.ID > b.ID {
		return 1
	}
	return 0
}

func (c *Controller) popNextOrder() Order {
	order := c.pending[0]
	c.pending = c.pending[1:]
	return order
}

func firstIdleBot(bots []Bot) *Bot {
	for i := range bots {
		if bots[i].Status == BotIdle {
			return &bots[i]
		}
	}
	return nil
}

func findBot(bots []Bot, id int) *Bot {
	for i := range bots {
		if bots[i].ID == id {
			return &bots[i]
		}
	}
	return nil
}

// copyOrder/copyBot 返回副本，避免把 run 内部 slice 元素的指针暴露出去。
func copyOrder(order Order) *Order {
	return &order
}

func copyBot(bot *Bot) *Bot {
	if bot == nil {
		return nil
	}
	value := *bot
	if bot.CurrentOrder != nil {
		value.CurrentOrder = copyOrder(*bot.CurrentOrder)
	}
	return &value
}

func copyBots(bots []Bot) []Bot {
	copied := make([]Bot, len(bots))
	for i := range bots {
		copied[i] = *copyBot(&bots[i])
	}
	return copied
}

func (c *Controller) log(format string, args ...interface{}) {
	if c.logWriter == nil {
		return
	}
	fmt.Fprintf(c.logWriter, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}
