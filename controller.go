package main

import (
	"fmt"
	"io"
	"sync"
	"time"
)

// ---------- 类型定义 ----------

type OrderType string

const (
	OrderNormal OrderType = "NORMAL"
	OrderVIP    OrderType = "VIP"
)

type OrderStatus string

const (
	StatusPending    OrderStatus = "PENDING"
	StatusProcessing OrderStatus = "PROCESSING"
	StatusComplete   OrderStatus = "COMPLETE"
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

// Bot 是独立的工作实体，拥有自己的协程。
// Controller 通过 orderCh 派单，通过 stopCh 发停止信号。
type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order
	orderCh      chan *Order      // 接收 Controller 派发的订单
	stopCh       chan struct{}    // 接收停止信号
	controller   *OrderController // 回调通知 Controller 订单完成/停止
}

// ---------- 订单控制器 ----------

type OrderController struct {
	mu            sync.Mutex
	vipPending    []*Order
	normalPending []*Order
	completed     []*Order
	bots          []*Bot
	idleBots      []*Bot
	nextOrderID   int
	nextBotID     int
	logWriter     io.Writer

	// 可配置，便于测试
	processingTime time.Duration
}

func NewOrderController(w io.Writer, processingTime time.Duration) *OrderController {
	return &OrderController{
		logWriter:      w,
		processingTime: processingTime,
	}
}

// ---------- 公开 API ----------

func (oc *OrderController) AddNormalOrder() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	oc.nextOrderID++
	order := &Order{ID: oc.nextOrderID, Type: OrderNormal, Status: StatusPending}
	oc.normalPending = append(oc.normalPending, order)
	oc.log("Created Normal Order #%d - Status: PENDING", order.ID)
	oc.dispatchToIdleBot()
}

func (oc *OrderController) AddVIPOrder() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	oc.nextOrderID++
	order := &Order{ID: oc.nextOrderID, Type: OrderVIP, Status: StatusPending}
	oc.vipPending = append(oc.vipPending, order)
	oc.log("Created VIP Order #%d - Status: PENDING", order.ID)
	oc.dispatchToIdleBot()
}

func (oc *OrderController) AddBot() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	oc.nextBotID++
	bot := &Bot{
		ID:         oc.nextBotID,
		Status:     BotIdle,
		orderCh:    make(chan *Order, 1),
		stopCh:     make(chan struct{}),
		controller: oc,
	}
	oc.bots = append(oc.bots, bot)
	oc.log("Bot #%d created - Status: ACTIVE", bot.ID)

	// 启动 Bot 独立协程
	go bot.run()

	// 新 Bot 尝试取单
	if order := oc.dequeueOrder(); order != nil {
		order.Status = StatusProcessing
		bot.Status = BotProcessing
		bot.CurrentOrder = order
		oc.log("Bot #%d picked up %s Order #%d - Status: PROCESSING",
			bot.ID, order.Type, order.ID)
		bot.orderCh <- order
	} else {
		bot.Status = BotIdle
		oc.idleBots = append(oc.idleBots, bot)
		oc.log("Bot #%d is now IDLE - No pending orders", bot.ID)
	}
}

func (oc *OrderController) RemoveNewestBot() {
	oc.mu.Lock()

	if len(oc.bots) == 0 {
		oc.mu.Unlock()
		return
	}

	// 移除最新创建的 Bot
	bot := oc.bots[len(oc.bots)-1]
	close(bot.stopCh)
	oc.mu.Unlock()
	// Bot 协程收到 stopCh 后自行清理（订单回归 / 从列表移除）
}

// WaitForIdle 阻塞直到所有机器人空闲且无待处理订单。
// 供模拟场景使用，判断所有工作是否完成。
func (oc *OrderController) WaitForIdle() {
	for {
		oc.mu.Lock()
		allIdle := true
		for _, b := range oc.bots {
			if b.Status != BotIdle {
				allIdle = false
				break
			}
		}
		noPending := len(oc.vipPending) == 0 && len(oc.normalPending) == 0
		oc.mu.Unlock()

		if allIdle && noPending {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
}

func (oc *OrderController) PrintStatus() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	vipCount := 0
	normalCount := 0
	for _, o := range oc.completed {
		if o.Type == OrderVIP {
			vipCount++
		} else {
			normalCount++
		}
	}

	oc.logRaw("")
	oc.logRaw("Final Status:")
	oc.logRaw("- Total Orders Processed: %d (%d VIP, %d Normal)", len(oc.completed), vipCount, normalCount)
	oc.logRaw("- Orders Completed: %d", len(oc.completed))
	oc.logRaw("- Active Bots: %d", len(oc.bots))
	oc.logRaw("- Pending Orders: %d", len(oc.vipPending)+len(oc.normalPending))
}

// ---------- Bot 独立协程 ----------

// run 是 Bot 的主循环，每个 Bot 在自己的协程中独立运行。
// Controller 通过 orderCh 派单，通过 stopCh 通知退出。
func (b *Bot) run() {
	for {
		select {
		case order := <-b.orderCh:
			// 起子任务协程：用 time.Sleep 模拟处理订单
			done := make(chan struct{})
			go func() {
				// 模拟处理订单
				time.Sleep(b.controller.processingTime)
				// 模拟处理完成
				close(done)
			}()

			select {
			case <-done:
				// 正常完成 → 通知 Controller
				b.controller.onOrderComplete(b, order)
			case <-b.stopCh:
				// 处理中被销毁 → 订单回归，子任务协程自然退出
				b.controller.onBotStopped(b, order)
				return
			}

		case <-b.stopCh:
			// 空闲时被销毁
			b.controller.onBotStopped(b, nil)
			return
		}
	}
}

// ---------- Bot 回调方法 ----------

// onOrderComplete 在 Bot 协程中调用，处理订单完成后的逻辑：
// 标记完成 → 尝试取下一单 → 取到则派给 Bot → 取不到则标记空闲。
func (oc *OrderController) onOrderComplete(bot *Bot, order *Order) {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	order.Status = StatusComplete
	oc.completed = append(oc.completed, order)
	bot.CurrentOrder = nil
	oc.log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)",
		bot.ID, order.Type, order.ID)

	// 尝试为 Bot 获取下一单
	if nextOrder := oc.dequeueOrder(); nextOrder != nil {
		nextOrder.Status = StatusProcessing
		bot.Status = BotProcessing
		bot.CurrentOrder = nextOrder
		oc.log("Bot #%d picked up %s Order #%d - Status: PROCESSING",
			bot.ID, nextOrder.Type, nextOrder.ID)
		bot.orderCh <- nextOrder
		return
	}

	// 无更多订单：Bot 进入空闲
	bot.Status = BotIdle
	oc.idleBots = append(oc.idleBots, bot)
	oc.log("Bot #%d is now IDLE - No pending orders", bot.ID)
}

// onBotStopped 在 Bot 协程中调用，处理 Bot 被销毁时的清理：
//   - order != nil：Bot 处理中被销毁 → 订单回归队列
//   - order == nil：Bot 空闲时被销毁
func (oc *OrderController) onBotStopped(bot *Bot, order *Order) {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if order != nil {
		// 处理中被销毁：订单回归
		oc.returnOrder(order)
		oc.log("Bot #%d destroyed while PROCESSING, Order #%d returned to PENDING",
			bot.ID, order.ID)
	} else {
		// 空闲时被销毁
		oc.removeBotFromSlice(bot, &oc.idleBots)
		oc.log("Bot #%d destroyed while IDLE", bot.ID)
	}
	oc.removeBotFromSlice(bot, &oc.bots)
}

// ---------- 内部：派单与队列操作（调用方需持有锁） ----------

// dispatchToIdleBot 将队列中的订单派发给空闲 Bot。
// VIP 优先：即使刚添加的是 Normal 订单，空闲 Bot 也会先取 VIP。
func (oc *OrderController) dispatchToIdleBot() {
	if len(oc.idleBots) == 0 {
		return
	}
	order := oc.dequeueOrder()
	if order == nil {
		return
	}

	bot := oc.idleBots[0]
	oc.idleBots = oc.idleBots[1:]
	order.Status = StatusProcessing
	bot.Status = BotProcessing
	bot.CurrentOrder = order
	oc.log("Bot #%d picked up %s Order #%d - Status: PROCESSING",
		bot.ID, order.Type, order.ID)
	bot.orderCh <- order
}

// dequeueOrder 从队列中取出优先级最高的订单（VIP 优先）。
func (oc *OrderController) dequeueOrder() *Order {
	if len(oc.vipPending) > 0 {
		order := oc.vipPending[0]
		oc.vipPending = oc.vipPending[1:]
		return order
	}
	if len(oc.normalPending) > 0 {
		order := oc.normalPending[0]
		oc.normalPending = oc.normalPending[1:]
		return order
	}
	return nil
}

func (oc *OrderController) returnOrder(order *Order) {
	order.Status = StatusPending

	if order.Type == OrderVIP {
		oc.vipPending = oc.insertByID(oc.vipPending, order)
	} else {
		oc.normalPending = oc.insertByID(oc.normalPending, order)
	}
}

// insertByID 按 ID 升序将订单插入队列正确位置。
func (oc *OrderController) insertByID(queue []*Order, order *Order) []*Order {
	pos := len(queue)
	for i, o := range queue {
		if o.ID > order.ID {
			pos = i
			break
		}
	}
	queue = append(queue, nil)
	copy(queue[pos+1:], queue[pos:])
	queue[pos] = order
	return queue
}

// ---------- 内部：机器人管理（调用方需持有锁） ----------

func (oc *OrderController) removeBotFromSlice(bot *Bot, list *[]*Bot) {
	for i, b := range *list {
		if b.ID == bot.ID {
			*list = append((*list)[:i], (*list)[i+1:]...)
			return
		}
	}
}

// ---------- 内部：日志输出 ----------

func (oc *OrderController) log(format string, args ...any) {
	fmt.Fprintf(oc.logWriter, "[%s] %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

func (oc *OrderController) logRaw(format string, args ...any) {
	fmt.Fprintf(oc.logWriter, format+"\n", args...)
}
