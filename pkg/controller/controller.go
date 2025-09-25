package controller

import (
	"container/list"
	"fmt"
	"sync"
	"time"
)

type Order struct {
	id  int
	vip bool
}

func (o *Order) String() string {
	if o.vip {
		return fmt.Sprintf("VIP-%d", o.id)
	}
	return fmt.Sprintf("Order-%d", o.id)
}

type Bot struct {
	id      int
	manager *Manager
	stopCh  chan struct{} // 用于通知该 bot 停止
	status  string
	mu      sync.Mutex
}

func (b *Bot) setStatus(s string) {
	b.mu.Lock()
	b.status = s
	b.mu.Unlock()
}

func (b *Bot) getStatus() string {
	b.mu.Lock()
	s := b.status
	b.mu.Unlock()
	return s
}

func LogWithTime(format string, a ...interface{}) {
	now := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, a...)
	fmt.Printf("[%s] %s\n", now, msg)
}

func (b *Bot) run() {
	for {
		// 阻塞地获取下一个订单，优先 VIP
		order := b.manager.fetchNextOrderBlocking(b.stopCh)
		if order == nil {
			// stop requested while waiting -> 退出
			b.setStatus("STOPPED")
			return
		}

		fmt.Printf("Bot-%d picked up %s\n", b.id, order)
		b.setStatus(fmt.Sprintf("PROCESSING %s", order))
		// 模拟处理时间：每个订单需要10秒（如需更快演示，可改为 shorter）
		processTimer := time.NewTimer(2 * time.Second)

		select {
		case <-processTimer.C:
			// 正常完成
			b.manager.completeOrder(order)
			b.setStatus("IDLE")
		case <-b.stopCh:
			// 被要求停止：把当前订单退回到对应队列（前端），然后退出
			if !processTimer.Stop() {
				<-processTimer.C
			}
			b.manager.requeueOrderFront(order)
			b.setStatus("STOPPED")
			return
		}
	}
}

// Manager
// 管理两个独立的待处理队列：vipPending 与 normalPending
type Manager struct {
	mu            sync.Mutex
	cond          *sync.Cond
	orderSeq      int
	vipPending    *list.List // VIP 队列（FIFO）
	normalPending *list.List // 普通队列（FIFO）
	complete      *list.List
	bots          []*Bot
}

func NewManager() *Manager {
	m := &Manager{
		vipPending:    list.New(),
		normalPending: list.New(),
		complete:      list.New(),
		bots:          make([]*Bot, 0),
	}
	m.cond = sync.NewCond(&m.mu)
	return m
}

// CreateOrder 根据 vip 标志放入对应的队列尾部（FIFO）
func (m *Manager) CreateOrder(vip bool) {
	m.mu.Lock()
	m.orderSeq++
	o := &Order{id: m.orderSeq, vip: vip}
	if vip {
		m.vipPending.PushBack(o)
	} else {
		m.normalPending.PushBack(o)
	}
	LogWithTime("Created normal order #%s", o)
	m.mu.Unlock()
	m.cond.Broadcast() // 唤醒等待的 bot
}

// fetchNextOrderBlocking：优先从 vipPending 取，其次 normalPending。
// 如果两个队列都空，则等待；如果 stopCh 在等待期间触发，则返回 nil 表示退出。
func (m *Manager) fetchNextOrderBlocking(stopCh chan struct{}) *Order {
	m.mu.Lock()
	defer m.mu.Unlock()

	for m.vipPending.Len() == 0 && m.normalPending.Len() == 0 {
		// 等待被唤醒（有新订单或被 broadcast）
		m.cond.Wait()

		// Wait 返回后，先检查是否收到停止信号
		select {
		case <-stopCh:
			return nil
		default:
		}
	}

	// 优先取 VIP
	if m.vipPending.Len() > 0 {
		e := m.vipPending.Front()
		o := e.Value.(*Order)
		m.vipPending.Remove(e)
		return o
	}
	// 取普通队列的头
	e := m.normalPending.Front()
	o := e.Value.(*Order)
	m.normalPending.Remove(e)
	return o
}

// requeueOrderFront：把订单放回到对应队列的“前端”（优先被处理）
func (m *Manager) requeueOrderFront(o *Order) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if o.vip {
		m.vipPending.PushFront(o)
	} else {
		m.normalPending.PushFront(o)
	}
	LogWithTime("Requeued #%s to front", o)
	m.cond.Broadcast()
}

// completeOrder：把订单放到完成列表
func (m *Manager) completeOrder(o *Order) {
	m.mu.Lock()
	m.complete.PushBack(o)
	m.mu.Unlock()
	LogWithTime("Completed #%s", o)
}

// AddBot 创建并启动一个新 bot
func (m *Manager) AddBot() {
	m.mu.Lock()
	id := len(m.bots) + 1
	b := &Bot{
		id:      id,
		manager: m,
		stopCh:  make(chan struct{}),
		status:  "IDLE",
	}
	m.bots = append(m.bots, b)
	m.mu.Unlock()

	go b.run()
	fmt.Printf("Added Bot-%d\n", id)
}

// RemoveBot 移除最新创建的 bot（LIFO）。如果该 bot 正在处理订单，会收到 stop 信号并把订单 requeue。
func (m *Manager) RemoveBot() {
	m.mu.Lock()
	if len(m.bots) == 0 {
		m.mu.Unlock()
		LogWithTime("No bots to remove")
		return
	}
	// newest bot is last
	idx := len(m.bots) - 1
	b := m.bots[idx]
	m.bots = m.bots[:idx]
	m.mu.Unlock()

	// 通知该 bot 停止（关闭 stopCh）
	close(b.stopCh)
	fmt.Printf("Removed Bot-%d (stop signaled)\n", b.id)
	// 不阻塞等待 goroutine 退出（可以在需要时加入等待逻辑）
}

// PrintStatus 显示两个队列和 bot 状态
func (m *Manager) PrintStatus() {
	LogWithTime("Current Status:")
	m.mu.Lock()
	defer m.mu.Unlock()
	fmt.Printf("=== BOTS (%d) ===\n", len(m.bots))
	for _, b := range m.bots {
		fmt.Printf("  Bot-%d : %s\n", b.id, b.getStatus())
	}
	fmt.Printf("=== VIP PENDING (%d) ===\n", m.vipPending.Len())
	for e := m.vipPending.Front(); e != nil; e = e.Next() {
		fmt.Printf("  %s\n", e.Value.(*Order))
	}
	fmt.Printf("=== NORMAL PENDING (%d) ===\n", m.normalPending.Len())
	for e := m.normalPending.Front(); e != nil; e = e.Next() {
		fmt.Printf("  %s\n", e.Value.(*Order))
	}
	fmt.Printf("=== COMPLETE (%d) ===\n", m.complete.Len())
	for e := m.complete.Front(); e != nil; e = e.Next() {
		fmt.Printf("  %s\n", e.Value.(*Order))
	}
}
