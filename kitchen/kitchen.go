// Package kitchen 实现「自动做菜机器人」的订单调度核心。
//
// 设计要点：
//   - 待处理队列 pending 始终按优先级有序（VIP 先、同类按下单序），
//     用二分插入维护；被抢占退回的订单沿用同一规则重新入队，
//     自动回到原相对位置，天然满足「保持优先级」的要求。
//   - 每个机器人是一个 goroutine，串行取单，单单耗时 cookTime。
//   - 状态由单一互斥锁保护；机器人空闲时用 sync.Cond 等待新单，
//     加单/加机器人/停机器人都会 Broadcast 唤醒重新判断。
//   - 停机器人（-Bot）关闭其 quit 通道：若在烹饪中，正在做的单
//     退回 pending；若在空闲等待，被唤醒后自行退出。
package kitchen

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

// Logger 接收调度过程中产生的事件文本（已是完整可读句子，不含时间戳）。
// 调用方（如 CLI）可自行加时间戳并落盘。传 nil 表示不记录。
type Logger func(msg string)

// bot 是一台做菜机器人。
type bot struct {
	id      int
	quit    chan struct{} // 关闭表示该机器人被移除
	done    chan struct{} // 关闭表示该机器人 goroutine 已退出
	current *Order        // 正在烹饪的订单，nil 表示空闲；受 Controller.mu 保护
}

// Controller 是订单控制器，管理待处理/已完成两个区域与一组机器人。
type Controller struct {
	mu       sync.Mutex
	cond     *sync.Cond
	orderSeq int
	botSeq   int
	pending  []*Order
	complete []*Order
	bots     []*bot
	cookTime time.Duration
	log      Logger
}

// New 创建控制器。cookTime 为单张订单的烹饪耗时（题目要求 10s，测试可传更小值）。
func New(cookTime time.Duration, log Logger) *Controller {
	c := &Controller{cookTime: cookTime, log: log}
	c.cond = sync.NewCond(&c.mu)
	return c
}

func (c *Controller) emit(format string, args ...any) {
	if c.log != nil {
		c.log(fmt.Sprintf(format, args...))
	}
}

// NewOrder 下一张订单，放入待处理区，返回订单号。
func (c *Controller) NewOrder(t OrderType) int {
	c.mu.Lock()
	c.orderSeq++
	o := &Order{ID: c.orderSeq, Type: t}
	c.enqueueLocked(o)
	c.mu.Unlock()

	c.emit("Order #%d (%s) created -> PENDING", o.ID, o.Type)
	c.cond.Broadcast() // 唤醒空闲机器人来接单
	return o.ID
}

// enqueueLocked 按优先级把订单插入 pending。调用前必须持有 mu。
func (c *Controller) enqueueLocked(o *Order) {
	// pending 已有序，找到第一个「优先级不高于 o」的位置插入。
	i := sort.Search(len(c.pending), func(i int) bool {
		return higherPriority(o, c.pending[i])
	})
	c.pending = append(c.pending, nil)
	copy(c.pending[i+1:], c.pending[i:])
	c.pending[i] = o
}

// AddBot 新增一台机器人，立即开始处理待处理订单。
func (c *Controller) AddBot() int {
	c.mu.Lock()
	c.botSeq++
	b := &bot{id: c.botSeq, quit: make(chan struct{}), done: make(chan struct{})}
	c.bots = append(c.bots, b)
	c.mu.Unlock()

	c.emit("Bot #%d added", b.id)
	go c.run(b)
	return b.id
}

// RemoveBot 移除最新加入的机器人。若它正在烹饪，正在做的订单退回待处理区。
// 返回被移除的机器人号；无机器人时返回 0。
func (c *Controller) RemoveBot() int {
	c.mu.Lock()
	if len(c.bots) == 0 {
		c.mu.Unlock()
		return 0
	}
	b := c.bots[len(c.bots)-1]
	c.bots = c.bots[:len(c.bots)-1]
	close(b.quit)
	c.cond.Broadcast() // 若它在空闲等待，唤醒它自行退出
	c.mu.Unlock()

	c.emit("Bot #%d removed", b.id)
	<-b.done // 等它真正收尾（退回订单等），保证移除后状态稳定
	return b.id
}

// run 是单台机器人的主循环。
func (c *Controller) run(b *bot) {
	defer close(b.done)
	for {
		c.mu.Lock()
		for len(c.pending) == 0 && !stopped(b) {
			c.cond.Wait()
		}
		if stopped(b) {
			c.mu.Unlock()
			return
		}
		o := c.pending[0]
		c.pending = c.pending[1:]
		b.current = o
		c.mu.Unlock()

		c.emit("Bot #%d started cooking order #%d (%s)", b.id, o.ID, o.Type)

		timer := time.NewTimer(c.cookTime)
		select {
		case <-timer.C:
			c.mu.Lock()
			b.current = nil
			c.complete = append(c.complete, o)
			c.mu.Unlock()
			c.emit("Bot #%d finished order #%d -> COMPLETE", b.id, o.ID)

		case <-b.quit:
			timer.Stop() // 及时释放定时器，避免抢占后计时器悬挂到 cookTime
			c.mu.Lock()
			b.current = nil
			c.enqueueLocked(o) // 退回原优先级位置
			c.mu.Unlock()
			c.emit("Bot #%d stopped, order #%d returned -> PENDING", b.id, o.ID)
			c.cond.Broadcast() // 让其它机器人接手这张退回的单
			return
		}
	}
}

// stopped 判断机器人是否已被移除（quit 已关闭）。
func stopped(b *bot) bool {
	select {
	case <-b.quit:
		return true
	default:
		return false
	}
}

// Shutdown 停止所有机器人并等待其退出，用于程序优雅收尾。
func (c *Controller) Shutdown() {
	for c.RemoveBot() != 0 {
	}
}
