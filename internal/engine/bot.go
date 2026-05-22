package engine

import (
    "context"
    "sync"
    "time"

    "se-take-home-assignment/internal/model"
)

// Bot 表示一个处理器：一次只能处理一个订单。
// 只负责从队列取单与计时，上报事件；不直接修改队列或全局状态。
type Bot struct {
    mu            sync.Mutex
    id            int
    state         model.BotState
    processingMs  int
    currentOrder  *model.OrderRef
    eventSink     chan<- model.BotEvent

    // 生命周期
    ctx    context.Context
    cancel context.CancelFunc

    // 引用队列用于取消时唤醒等待者
    q *PriorityDequeQueue
}

// NewBot 创建一个新的 Bot，处理时长以毫秒为单位。
func NewBot(id int, processingMs int, eventSink chan<- model.BotEvent) *Bot {
    return &Bot{
        id:           id,
        state:        model.BotIdle,
        processingMs: processingMs,
        eventSink:    eventSink,
    }
}

// ID 返回 Bot 的唯一标识。
func (b *Bot) ID() int {
    b.mu.Lock(); defer b.mu.Unlock()
    return b.id
}

// State 返回 Bot 当前状态（IDLE/BUSY/STOPPED）。
func (b *Bot) State() model.BotState {
    b.mu.Lock(); defer b.mu.Unlock()
    return b.state
}

// CurrentOrder 返回 Bot 当前处理的订单（若有）。
func (b *Bot) CurrentOrder() *model.OrderRef {
    b.mu.Lock(); defer b.mu.Unlock()
    if b.currentOrder == nil { return nil }
    cpy := *b.currentOrder
    return &cpy
}

// Start 启动 Bot 主循环：空闲时向队列索取订单，拿到后计时处理，完成或被取消时上报事件。
func (b *Bot) Start(ctx context.Context, q *PriorityDequeQueue) {
    b.mu.Lock()
    if b.ctx != nil {
        b.mu.Unlock()
        return // 已经启动
    }
    b.q = q
    b.ctx, b.cancel = context.WithCancel(ctx)
    b.mu.Unlock()

    // 上报告知启动
    b.emit(model.BotEvent{Type: model.EventBotStarted, BotID: b.id, Timestamp: time.Now()})

    go func() {
        defer b.emit(model.BotEvent{Type: model.EventBotStopped, BotID: b.id, Timestamp: time.Now()})
        for {
            // 进入空闲状态
            b.setState(model.BotIdle, nil)
            b.emit(model.BotEvent{Type: model.EventBotIdle, BotID: b.id, Timestamp: time.Now()})

            // 阻塞取单，支持取消
            order, err := q.WaitAndDequeuePriority(b.ctx)
            if err != nil {
                // 取消或队列关闭 -> 退出
                return
            }

            // 切换为 BUSY
            b.setState(model.BotBusy, &order)
            b.emit(model.BotEvent{Type: model.EventOrderAssigned, BotID: b.id, Order: &order, Timestamp: time.Now()})

            // 处理计时或取消
            timer := time.NewTimer(b.processingDuration())
            select {
            case <-timer.C:
                // 完成
                b.emit(model.BotEvent{Type: model.EventOrderCompleted, BotID: b.id, Order: &order, Timestamp: time.Now()})
                b.setState(model.BotIdle, nil)
            case <-b.ctx.Done():
                // 中断
                if !timer.Stop() {
                    <-timer.C // 排空，防止泄漏
                }
                b.emit(model.BotEvent{Type: model.EventOrderInterrupted, BotID: b.id, Order: &order, Timestamp: time.Now()})
                // 退出循环
                return
            }
        }
    }()
}

// Cancel 请求取消当前 Bot（用于“最新 Bot 下线”），应触发处理中断并上报事件。
func (b *Bot) Cancel() {
    b.mu.Lock()
    if b.cancel != nil {
        b.cancel()
    }
    q := b.q
    b.mu.Unlock()
    // 唤醒可能在等待中的取单
    if q != nil {
        q.WakeAll()
    }
}

// Dispose 释放 Bot 资源（停止 goroutine、清理定时器等）。
func (b *Bot) Dispose() {
    // 当前实现 Cancel 已足够触发退出；此处保留以后扩展。
    b.Cancel()
}

// 内部：设置状态与当前订单（需持锁）。
func (b *Bot) setState(state model.BotState, ord *model.OrderRef) {
    b.mu.Lock()
    defer b.mu.Unlock()
    b.state = state
    if ord == nil { b.currentOrder = nil } else { c := *ord; b.currentOrder = &c }
}

// 内部：发送事件（非阻塞假设：由调度器消费）。
func (b *Bot) emit(ev model.BotEvent) {
    select {
    case b.eventSink <- ev:
    default:
        // 若通道满（不太可能），尝试阻塞发送，保证事件不丢
        b.eventSink <- ev
    }
}

// processingDuration 返回处理时长。
func (b *Bot) processingDuration() time.Duration { return time.Duration(b.processingMs) * time.Millisecond }
