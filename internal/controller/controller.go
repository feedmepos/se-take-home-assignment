package controller

import (
	"fmt"
	"io"
	"time"
)

const processingDuration = 10 * time.Second

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
	OrderPending  OrderStatus = "PENDING"
	OrderComplete OrderStatus = "COMPLETE"
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
	ID             int
	Status         BotStatus
	CurrentOrderID int
	currentType    OrderType
}

type Snapshot struct {
	Pending   []Order
	Completed []Order
	Bots      []Bot
}

// Controller 通过 commands channel 串行化所有状态变更。
// pending 队列和 bot 列表只会在 run 这个 goroutine 里读写，因此不需要 mutex。
type Controller struct {
	commands  chan command
	completed chan Order
	done      chan struct{}
	logWriter io.Writer
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
		commands: make(chan command),
		// completed 只用于通知外部“有订单完成了”，容量给一点缓冲，避免 CLI 短时间没读取时卡住 controller。
		completed: make(chan Order, 16),
		done:      make(chan struct{}),
		logWriter: logWriter,
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

// Completed 返回只读 channel，外部可以用它等待订单真正制作完成。
func (c *Controller) Completed() <-chan Order {
	return c.completed
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
	var vipPending []Order
	var normalPending []Order
	var completed []Order
	var bots []Bot
	nextOrderID := 1
	nextBotID := 1

	for cmd := range c.commands {
		switch cmd.kind {
		case cmdNewOrder:
			order := Order{
				ID:     nextOrderID,
				Type:   cmd.orderTy,
				Status: OrderPending,
			}
			nextOrderID++
			addPendingOrder(&vipPending, &normalPending, order)
			c.log("%s Order #%d created - Status: PENDING", order.Type, order.ID)
			c.dispatchOrders(&vipPending, &normalPending, &bots)
			cmd.reply <- response{order: copyOrder(order)}

		case cmdAddBot:
			bot := Bot{ID: nextBotID, Status: BotIdle}
			nextBotID++
			bots = append(bots, bot)
			c.log("Bot #%d created - Status: ACTIVE", bot.ID)
			c.dispatchOrders(&vipPending, &normalPending, &bots)
			created := findBot(bots, bot.ID)
			cmd.reply <- response{bot: copyBot(created)}

		case cmdRemoveBot:
			if len(bots) == 0 {
				cmd.reply <- response{}
				continue
			}
			// 作业要求删除“最后一个 bot”。如果它正在制作订单，需要把订单退回 pending 队列。
			removed := bots[len(bots)-1]
			bots = bots[:len(bots)-1]
			if removed.Status == BotProcessing {
				order := pendingOrderFromBot(removed)
				addPendingOrder(&vipPending, &normalPending, order)
				c.log("Bot #%d destroyed while PROCESSING - %s Order #%d returned to PENDING", removed.ID, order.Type, order.ID)
			} else {
				c.log("Bot #%d destroyed while IDLE", removed.ID)
			}
			cmd.reply <- response{bot: copyBot(&removed)}

		case cmdCompleteOrder:
			bot := findBot(bots, cmd.botID)
			if bot == nil || bot.Status != BotProcessing || bot.CurrentOrderID != cmd.orderID {
				continue
			}
			order := Order{
				ID:     cmd.orderID,
				Type:   bot.currentType,
				Status: OrderComplete,
			}
			completed = append(completed, order)
			c.log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", bot.ID, order.Type, order.ID)
			c.notifyCompleted(order)
			bot.Status = BotIdle
			bot.CurrentOrderID = 0
			c.dispatchOrders(&vipPending, &normalPending, &bots)
			// dispatchOrders 可能会立刻把下一单分配给这个 bot，所以这里要重新检查它是否仍然 idle。
			if bot.Status == BotIdle && countPendingOrders(vipPending, normalPending) == 0 {
				c.log("Bot #%d is now IDLE - No pending orders", bot.ID)
			}

		case cmdSnapshot:
			// 返回快照时复制 slice，避免外部拿到内部状态的引用后误改 controller 状态。
			cmd.reply <- response{snapshot: Snapshot{
				Pending:   listPendingOrders(vipPending, normalPending),
				Completed: append([]Order(nil), completed...),
				Bots:      append([]Bot(nil), bots...),
			}}

		case cmdStop:
			cmd.reply <- response{}
			return
		}
	}
}

// dispatchOrders 尽可能把 pending 订单派给空闲 bot。
// 具体优先级由 popNextOrder 决定：VIP 队列优先，其次普通队列。
func (c *Controller) dispatchOrders(vipPending, normalPending *[]Order, bots *[]Bot) {
	for countPendingOrders(*vipPending, *normalPending) > 0 {
		bot := firstIdleBot(*bots)
		if bot == nil {
			return
		}
		order := popNextOrder(vipPending, normalPending)
		bot.Status = BotProcessing
		bot.CurrentOrderID = order.ID
		bot.currentType = order.Type
		c.log("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, order.Type, order.ID)
		c.makeOrder(bot.ID, order.ID)
	}
}

// makeOrder 模拟真实的订单制作过程。
// 制作耗时不放在 run 里等待，否则 controller 就无法继续处理新订单、加 bot、删 bot 等命令。
// 制作完成后只发回 cmdCompleteOrder，由 run 统一判断这次完成事件是否仍然有效。
func (c *Controller) makeOrder(botID, orderID int) {
	go func() {
		timer := time.NewTimer(processingDuration)
		defer timer.Stop()
		select {
		case <-timer.C:
			select {
			case c.commands <- command{kind: cmdCompleteOrder, botID: botID, orderID: orderID}:
			case <-c.done:
			}
		case <-c.done:
		}
	}()
}

// notifyCompleted 只负责通知外部有订单完成，不参与 controller 内部状态修改。
func (c *Controller) notifyCompleted(order Order) {
	select {
	case c.completed <- order:
	case <-c.done:
	}
}

// addPendingOrder 按订单类型追加到对应队列尾部，保证同类型订单 FIFO。
func addPendingOrder(vipPending, normalPending *[]Order, order Order) {
	if order.Type == VIP {
		*vipPending = append(*vipPending, order)
		return
	}
	*normalPending = append(*normalPending, order)
}

// popNextOrder 始终先取 VIP 队列；VIP 为空时再取普通队列。
func popNextOrder(vipPending, normalPending *[]Order) Order {
	if len(*vipPending) > 0 {
		order := (*vipPending)[0]
		*vipPending = (*vipPending)[1:]
		return order
	}
	order := (*normalPending)[0]
	*normalPending = (*normalPending)[1:]
	return order
}

// listPendingOrders 用于快照展示，顺序保持为“所有 VIP pending 在前，普通 pending 在后”。
func listPendingOrders(vipPending, normalPending []Order) []Order {
	pending := append([]Order(nil), vipPending...)
	return append(pending, normalPending...)
}

func countPendingOrders(vipPending, normalPending []Order) int {
	return len(vipPending) + len(normalPending)
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
	return &value
}

func (c *Controller) log(format string, args ...interface{}) {
	if c.logWriter == nil {
		return
	}
	fmt.Fprintf(c.logWriter, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

func pendingOrderFromBot(bot Bot) Order {
	return Order{
		ID:     bot.CurrentOrderID,
		Type:   bot.currentType,
		Status: OrderPending,
	}
}
