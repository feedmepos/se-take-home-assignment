// Package order 实现了一个 McDonald's 风格的订单调度系统：
// 订单分 VIP / Normal 两类，VIP 优先；多个 Bot 并发处理，每个订单固定耗时 processingTime。
package order

import (
	"container/list"
	"errors"
	"sync"
	"time"
)

// ErrNoBots 在没有 bot 可删除时由 RemoveNewestBot 返回。
var ErrNoBots = errors.New("no bots available")

// pending 的两个队列索引。索引顺序即优先级顺序——pendingIdxVIP 在前，
// assignLocked 从 0 开始找第一个非空队列 pop，保证 VIP 整体优先于 Normal。
const (
	pendingIdxVIP = iota
	pendingIdxNormal
)

// readyBot 是 bot 通过 readyCh 向 dispatchLoop 发出的"我空闲了"的信号，
// 携带 bot 自己的 orderCh 让 dispatchLoop 能直接把订单推进去。
type readyBot struct {
	botID   int
	orderCh chan *Order
}

// Bot 是一个处理订单的工作 goroutine 的状态。
// 生命周期由两个 channel 协调：
//   - stopCh:  关闭表示"请退出"（由 RemoveNewestBot/Shutdown 触发）。
//   - doneCh:  关闭表示 goroutine 已退出（供 Shutdown/RemoveNewestBot 等待）。
// active 字段在 mu 下读写，stopCh 关闭前必先置 active=false（见 RemoveNewestBot/Shutdown）。
type Bot struct {
	id      int
	stopCh  chan struct{}
	doneCh  chan struct{}
	orderCh chan *Order
	current *Order
	active  bool
}

// Controller 维护订单队列、bot 池和调度循环。
// 所有字段（除启动后只读的 logger/processingTime）都在 mu 下访问。
// shutdownCh 关闭后整个系统进入终止流程，shutdownOnce 保证 Shutdown 幂等。
type Controller struct {
	mu                 sync.Mutex
	logger             *EventLogger
	processingTime     time.Duration
	nextOrderID        int
	nextBotID          int
	// pending 按优先级索引：pending[0] 是 VIP，pending[1] 是 Normal。
	// 索引顺序就是派单优先级顺序，assignLocked 从 0 开始找第一个非空的 pop。
	pending            []*list.List
	vipCompleted       int
	normalCompleted    int
	bots               map[int]*Bot
	botOrder           []int
	idleBots           *list.List
	readyCh            chan readyBot
	shutdownCh         chan struct{}
	shutdownOnce       sync.Once
	dispatchLoopDoneCh chan struct{}
}

// NewController 创建并启动 controller，processingTime<=0 时按 10s 计。
// 启动后立刻 spawn dispatchLoop，调用方负责在结束时调 Shutdown。
func NewController(logger *EventLogger, processingTime time.Duration) *Controller {
	if processingTime <= 0 {
		processingTime = 10 * time.Second
	}
	c := &Controller{
		logger:             logger,
		processingTime:     processingTime,
		nextOrderID:        1001,
		nextBotID:          1,
		pending: []*list.List{
			pendingIdxVIP:    list.New(),
			pendingIdxNormal: list.New(),
		},
		idleBots:           list.New(),
		bots:               make(map[int]*Bot),
		readyCh:            make(chan readyBot),
		shutdownCh:         make(chan struct{}),
		dispatchLoopDoneCh: make(chan struct{}),
	}
	logger.Header()
	logger.Event("System initialized with 0 bots")
	go c.dispatchLoop()
	return c
}

// CreateOrder 入队一个订单。orderType 非 VIP 一律按 Normal 处理。
// 返回的是创建时刻的 order 快照（值拷贝），调用方无法借此跟踪后续状态。
func (c *Controller) CreateOrder(orderType OrderType) Order {
	if orderType != VIPOrder {
		orderType = NormalOrder
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	order := &Order{ID: c.nextOrderID, Type: orderType, Status: PendingStatus, CreatedAt: time.Now()}
	c.nextOrderID++
	c.enqueueLocked(order)
	c.logger.Event("Created %s Order #%d - Status: %s", order.Type, order.ID, order.Status)
	c.assignLocked()
	snapshot := *order
	return snapshot
}

// AddBot 创建并启动一个新的 bot goroutine。
func (c *Controller) AddBot() BotSnapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	bot := &Bot{id: c.nextBotID, stopCh: make(chan struct{}), doneCh: make(chan struct{}), orderCh: make(chan *Order, 1), active: true}
	c.nextBotID++
	c.bots[bot.id] = bot
	c.botOrder = append(c.botOrder, bot.id)
	c.logger.Event("Bot #%d created - Status: %s", bot.id, ActiveBot)
	go c.runBot(bot)
	snapshot := BotSnapshot{ID: bot.id, Status: ActiveBot}
	return snapshot
}

// RemoveNewestBot 删除最近添加的 bot。如果该 bot 正处理订单，订单会被退回 pending 队首。
// 必须先在 mu 下完成状态变更（active=false、close stopCh、清 idleBots 中的 stale 条目），
// 再释放 mu 等 doneCh——否则 bot goroutine 在 returnOrder 里需要 mu 会死锁。
func (c *Controller) RemoveNewestBot() (BotSnapshot, error) {
	c.mu.Lock()

	if len(c.botOrder) == 0 {
		c.mu.Unlock()
		return BotSnapshot{}, ErrNoBots
	}
	id := c.botOrder[len(c.botOrder)-1]
	c.botOrder = c.botOrder[:len(c.botOrder)-1]
	bot := c.bots[id]
	delete(c.bots, id)
	bot.active = false
	// 清掉 idleBots 里属于被删 bot 的 stale 条目（如果有）。
	for e := c.idleBots.Front(); e != nil; {
		next := e.Next()
		if e.Value.(readyBot).botID == id {
			c.idleBots.Remove(e)
		}
		e = next
	}
	processingID := 0
	if bot.current != nil {
		processingID = bot.current.ID
	}
	close(bot.stopCh)
	c.mu.Unlock()
	<-bot.doneCh
	return BotSnapshot{ID: id, Status: IdleBot, ProcessingID: processingID}, nil
}

// Snapshot 返回当前系统的不可变快照。所有 slice 都是值拷贝，调用方可任意修改。
func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	s := Snapshot{TotalOrders: c.nextOrderID - 1001}
	for _, l := range c.pending {
		for e := l.Front(); e != nil; e = e.Next() {
			s.Pending = append(s.Pending, *e.Value.(*Order))
		}
	}
	s.VIPCompleted = c.vipCompleted
	s.NormCompleted = c.normalCompleted
	for _, id := range c.botOrder {
		if bot, ok := c.bots[id]; ok {
			bs := BotSnapshot{ID: id, Status: IdleBot}
			if bot.current != nil {
				bs.Status = ActiveBot
				bs.ProcessingID = bot.current.ID
				bs.ProcessingVIP = bot.current.Type == VIPOrder
				s.Processing = append(s.Processing, *bot.current)
			}
			s.Bots = append(s.Bots, bs)
		}
	}
	return s
}

// WriteFinalStatus 向 logger 写一段最终状态摘要。可在 shutdown 前调用以落地统计。
func (c *Controller) WriteFinalStatus() {
	s := c.Snapshot()
	completed := s.VIPCompleted + s.NormCompleted
	c.logger.BlankLine()
	c.logger.Line("Final Status:")
	c.logger.Line("- Total Orders Processed: %d (%d VIP, %d Normal)", completed, s.VIPCompleted, s.NormCompleted)
	c.logger.Line("- Orders Completed: %d", completed)
	c.logger.Line("- Active Bots: %d", len(s.Bots))
	c.logger.Line("- Pending Orders: %d", len(s.Pending))
}

// Shutdown 关闭 dispatchLoop 和所有 bot goroutine，处理中的订单会被退回 pending。
// 幂等（sync.Once）。在 mu 下关 stopCh、在 mu 外等 doneCh——避免 bot 在 returnOrder
// 里要 mu 时和这里互相等死。
func (c *Controller) Shutdown() {
	c.shutdownOnce.Do(func() {
		close(c.shutdownCh)
		c.mu.Lock()
		bots := make([]*Bot, 0, len(c.botOrder))
		for _, id := range c.botOrder {
			if bot, ok := c.bots[id]; ok && bot.active {
				bot.active = false
				close(bot.stopCh)
				bots = append(bots, bot)
			}
		}
		c.mu.Unlock()
		<-c.dispatchLoopDoneCh
		for _, bot := range bots {
			<-bot.doneCh
		}
	})
}

// dispatchLoop 是单线程调度器：接收 bot 的"ready"信号，把它加入 idleBots，
// 然后调 assignLocked 尝试派单。shutdownCh 关闭即退出。
func (c *Controller) dispatchLoop() {
	defer close(c.dispatchLoopDoneCh)
	for {
		select {
		case rb := <-c.readyCh:
			func() {
				c.mu.Lock()
				defer c.mu.Unlock()

				bot, ok := c.bots[rb.botID]
				if ok && bot.active {
					c.idleBots.PushBack(rb)
					if !c.hasPendingLocked() {
						c.logger.Event("Bot #%d is now IDLE - No pending orders", rb.botID)
					}
					c.assignLocked()
				}
			}()
		case <-c.shutdownCh:
			return
		}
	}
}

// runBot 是每个 bot 的主循环 goroutine，三段 select 表示三种状态：
//  1. 宣告空闲：把 readyBot 推给 dispatchLoop；被 stop/shutdown 中断即退出。
//  2. 等订单：从 orderCh 取 assignLocked 派来的订单；被中断则需排空 orderCh
//     （见 drainOrderOrIdle）以防 assignLocked 刚 send 的订单丢失。
//  3. 处理中：等 timer 到点完成；中途被 stop/shutdown 中断则 returnOrder 退单。
//
// doneCh 在退出时关闭，供 Shutdown/RemoveNewestBot 等待。
func (c *Controller) runBot(bot *Bot) {
	defer close(bot.doneCh)
	for {
		select {
		case c.readyCh <- readyBot{botID: bot.id, orderCh: bot.orderCh}:
		case <-bot.stopCh:
			c.logger.Event("Bot #%d destroyed while IDLE", bot.id)
			return
		case <-c.shutdownCh:
			return
		}

		select {
		case order := <-bot.orderCh:
			c.logger.Event("Bot #%d picked up %s Order #%d - Status: %s", bot.id, order.Type, order.ID, order.Status)
			timer := time.NewTimer(c.processingTime)
			select {
			case <-timer.C:
				c.completeOrder(bot, order)
			case <-bot.stopCh:
				timer.Stop()
				c.returnOrder(bot, order)
				return
			case <-c.shutdownCh:
				timer.Stop()
				c.returnOrder(bot, order)
				return
			}
		case <-bot.stopCh:
			c.drainOrderOrIdle(bot)
			return
		case <-c.shutdownCh:
			c.drainOrderOrIdle(bot)
			return
		}
	}
}

// drainOrderOrIdle 处理"等订单阶段被中断"的情况：如果 orderCh 里有 assignLocked
// 刚 send 进来但还没被本 bot 读取的订单，必须取出退回，否则订单会随 bot 退出而丢失。
// 这是修第二段 select 的竞态——orderCh 就绪和 stopCh 就绪同时发生时 select 随机挑，
// 挑到 stopCh 那个分支需要靠这里把订单捞回来。
func (c *Controller) drainOrderOrIdle(bot *Bot) {
	select {
	case order := <-bot.orderCh:
		c.returnOrder(bot, order)
	default:
		c.logger.Event("Bot #%d destroyed while IDLE", bot.id)
	}
}

// completeOrder 由 bot 的 timer 到点触发。检查 bot.active 和 bot.current.ID 是
// 防御性的：理论上 timer 触发时 bot.current 必等于 order，但 stopCh 和 timer.C
// 可能同时就绪，select 挑了 timer.C 这边时 bot 状态可能已被 returnOrder 清掉。
func (c *Controller) completeOrder(bot *Bot, order *Order) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if bot.active && bot.current != nil && bot.current.ID == order.ID {
		order.Status = CompleteStatus
		order.DoneAt = time.Now()
		bot.current = nil
		if order.Type == VIPOrder {
			c.vipCompleted++
		} else {
			c.normalCompleted++
		}
		c.logger.Event("Bot #%d completed %s Order #%d - Status: %s (Processing time: 10s)", bot.id, order.Type, order.ID, order.Status)
	}
}

// returnOrder 把 bot 中断时未完成的订单退回 pending 队首（保留创建顺序优先级），
// 然后立即调 assignLocked 尝试把它派给其他空闲 bot。
func (c *Controller) returnOrder(bot *Bot, order *Order) {
	c.mu.Lock()
	defer c.mu.Unlock()

	order.Status = PendingStatus
	order.StartedAt = time.Time{}
	bot.current = nil
	c.reEnqueueLocked(order)
	c.logger.Event("Bot #%d destroyed while processing %s Order #%d - Status: PENDING", bot.id, order.Type, order.ID)
	c.assignLocked()
}

// enqueueLocked 把新订单入队尾（同类 FIFO）。命名后缀 Locked 表示调用方必须已持 mu。
func (c *Controller) enqueueLocked(order *Order) {
	order.Status = PendingStatus
	idx := pendingIdxNormal
	if order.Type == VIPOrder {
		idx = pendingIdxVIP
	}
	c.pending[idx].PushBack(order)
}

// reEnqueueLocked 把被中断的订单退回 pending 队首，保留它的"创建顺序优先级"。
// 与 enqueueLocked（新单入队尾）相对。
func (c *Controller) reEnqueueLocked(order *Order) {
	order.Status = PendingStatus
	idx := pendingIdxNormal
	if order.Type == VIPOrder {
		idx = pendingIdxVIP
	}
	c.pending[idx].PushFront(order)
}

// hasPendingLocked 判断任意 pending 队列非空。
func (c *Controller) hasPendingLocked() bool {
	for _, l := range c.pending {
		if l.Len() > 0 {
			return true
		}
	}
	return false
}

// popPendingLocked 按 pending 索引顺序（= 优先级顺序）从第一个非空队列弹出队首订单。
// pending 为空时返回 nil。
func (c *Controller) popPendingLocked() *Order {
	for _, l := range c.pending {
		if l.Len() > 0 {
			return l.Remove(l.Front()).(*Order)
		}
	}
	return nil
}

// assignLocked 把 pending 队首的订单派给空闲 bot。VIP 队列优先于 Normal。
// select 的 stopCh/default 分支是防御性死代码——bot.active 在 mu 下检查过、
// orderCh 是 cap=1 且 bot 不会重复 announce，所以 send 实际不会失败；
// 留着以防未来重构破坏这些不变量，避免 send 在 mu 下阻塞导致死锁。
func (c *Controller) assignLocked() {
	for c.idleBots.Len() > 0 && c.hasPendingLocked() {
		e := c.idleBots.Front()
		c.idleBots.Remove(e)
		rb := e.Value.(readyBot)
		bot, ok := c.bots[rb.botID]
		if !ok || !bot.active {
			continue
		}
		order := c.popPendingLocked()
		order.Status = ProcessingStatus
		order.StartedAt = time.Now()
		bot.current = order
		select {
		case rb.orderCh <- order:
		case <-bot.stopCh:
			bot.current = nil
			order.Status = PendingStatus
			c.reEnqueueLocked(order)
		default:
			bot.current = nil
			order.Status = PendingStatus
			c.reEnqueueLocked(order)
		}
	}
}
