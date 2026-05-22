package engine

import (
    "context"
    "fmt"
    "sync"
    "time"

    "se-take-home-assignment/internal/logging"
    "se-take-home-assignment/internal/model"
)

// Scheduler（管理/调度器）串行处理命令、事件与状态变更。
type Scheduler struct {
    mu           sync.Mutex
    q            *PriorityDequeQueue
    logger       logging.Logger
    processingMs int

    // 订单
    nextOrderID int64
    complete    []model.OrderRef
    owned       map[int64]int // orderID -> botID（归属校验，去重）

    // 机器人
    nextBotID int
    bots      map[int]*Bot
    botStack  []int // 最新在栈顶

    // 事件
    events chan model.BotEvent

    // 运行上下文（Run(ctx) 设置）
    runCtx context.Context
}

// NewScheduler 创建调度器。
func NewScheduler(q *PriorityDequeQueue, logger logging.Logger, processingMs int) *Scheduler {
    return &Scheduler{
        q:            q,
        logger:       logger,
        processingMs: processingMs,
        bots:         make(map[int]*Bot),
        events:       make(chan model.BotEvent, 256),
        runCtx:       context.Background(),
        owned:        make(map[int64]int),
    }
}

// Run 启动调度循环，处理来自 Bot 的事件，直至 ctx 结束。
func (s *Scheduler) Run(ctx context.Context) error {
    s.mu.Lock()
    s.runCtx = ctx
    s.mu.Unlock()

    for {
        select {
        case <-ctx.Done():
            return nil
        case ev := <-s.events:
            s.OnBotEvent(ev)
        }
    }
}

// SubmitNormalOrder 创建一个 Normal 订单并入队（队尾）。
func (s *Scheduler) SubmitNormalOrder() model.Order {
    s.mu.Lock()
    s.nextOrderID++
    id := s.nextOrderID
    s.mu.Unlock()

    ref := model.OrderRef{ID: id, Type: model.OrderTypeNormal}
    _ = s.q.EnqueueNormalBack(ref)
    s.logger.WithTS(time.Now(), "NEW NORMAL ORDER #%d", id)
    return model.Order{ID: id, Type: model.OrderTypeNormal, Status: model.OrderPending, CreatedAt: time.Now()}
}

// SubmitVIPOrder 创建一个 VIP 订单并入队（队尾）。
func (s *Scheduler) SubmitVIPOrder() model.Order {
    s.mu.Lock()
    s.nextOrderID++
    id := s.nextOrderID
    s.mu.Unlock()

    ref := model.OrderRef{ID: id, Type: model.OrderTypeVIP}
    _ = s.q.EnqueueVIPBack(ref)
    s.logger.WithTS(time.Now(), "NEW VIP ORDER #%d", id)
    return model.Order{ID: id, Type: model.OrderTypeVIP, Status: model.OrderPending, CreatedAt: time.Now()}
}

// AddBot 新增一个 Bot，并让其立即尝试领取订单。
func (s *Scheduler) AddBot() {
    s.mu.Lock()
    s.nextBotID++
    id := s.nextBotID
    b := NewBot(id, s.processingMs, s.events)
    s.bots[id] = b
    s.botStack = append(s.botStack, id)
    runCtx := s.runCtx
    s.mu.Unlock()

    s.logger.WithTS(time.Now(), "BOT + #%d", id)
    b.Start(runCtx, s.q)
}

// RemoveLatestBot 销毁最新创建的 Bot；若在处理，则中断并将订单回到“对应类别队头”。
func (s *Scheduler) RemoveLatestBot() {
    s.mu.Lock()
    if len(s.botStack) == 0 {
        s.mu.Unlock()
        s.logger.WithTS(time.Now(), "NO BOT TO REMOVE")
        return
    }
    lastIdx := len(s.botStack) - 1
    id := s.botStack[lastIdx]
    s.botStack = s.botStack[:lastIdx]
    b := s.bots[id]
    delete(s.bots, id)
    s.mu.Unlock()

    s.logger.WithTS(time.Now(), "BOT - #%d", id)
    if b != nil {
        b.Cancel()
        b.Dispose()
    }
}

// OnBotEvent 处理 Bot 上报事件（完成/中断/空闲/启动/停止等）。
func (s *Scheduler) OnBotEvent(ev model.BotEvent) {
    switch ev.Type {
    case model.EventBotStarted:
        s.logger.WithTS(ev.Timestamp, "BOT #%d STARTED", ev.BotID)
    case model.EventBotStopped:
        s.logger.WithTS(ev.Timestamp, "BOT #%d STOPPED", ev.BotID)
    case model.EventBotIdle:
        s.logger.WithTS(ev.Timestamp, "BOT #%d IDLE", ev.BotID)
    case model.EventOrderAssigned:
        if ev.Order != nil {
            // 归属登记
            s.mu.Lock()
            s.owned[ev.Order.ID] = ev.BotID
            s.mu.Unlock()
            s.logger.WithTS(ev.Timestamp, "BOT #%d ASSIGNED ORDER #%d (%s)", ev.BotID, ev.Order.ID, ev.Order.Type)
        }
    case model.EventOrderCompleted:
        if ev.Order != nil {
            // 只接受来自当前归属 Bot 的完成事件
            s.mu.Lock()
            owner, ok := s.owned[ev.Order.ID]
            if ok && owner == ev.BotID {
                delete(s.owned, ev.Order.ID)
                s.complete = append(s.complete, *ev.Order)
                s.mu.Unlock()
                s.logger.WithTS(ev.Timestamp, "ORDER #%d COMPLETE", ev.Order.ID)
            } else {
                s.mu.Unlock()
                // 忽略过期/重复的完成事件
            }
        }
    case model.EventOrderInterrupted:
        if ev.Order != nil {
            // 仅当该订单仍归属于此 Bot 时，才进行回队并清除归属
            doRequeue := false
            s.mu.Lock()
            owner, ok := s.owned[ev.Order.ID]
            if ok && owner == ev.BotID {
                delete(s.owned, ev.Order.ID)
                doRequeue = true
            }
            s.mu.Unlock()
            if doRequeue {
                if ev.Order.Type == model.OrderTypeVIP {
                    _ = s.q.EnqueueVIPFront(*ev.Order)
                } else {
                    _ = s.q.EnqueueNormalFront(*ev.Order)
                }
                s.logger.WithTS(ev.Timestamp, "ORDER #%d INTERRUPTED by BOT #%d -> REQUEUED FRONT (%s)", ev.Order.ID, ev.BotID, ev.Order.Type)
            } else {
                // 忽略过期/重复的中断
            }
        }
    default:
        s.logger.WithTS(time.Now(), "UNKNOWN EVENT: %+v", ev)
    }
}

// Status 返回一份一致性的系统快照，用于 status 展示。
func (s *Scheduler) Status() model.StatusSnapshot {
    s.mu.Lock()
    bots := make([]model.BotInfo, 0, len(s.bots))
    for id, b := range s.bots {
        co := b.CurrentOrder()
        bots = append(bots, model.BotInfo{ID: id, State: b.State(), CurrentOrder: co})
    }
    s.mu.Unlock()

    vip, normal := s.q.Snapshot()
    s.mu.Lock()
    cc := len(s.complete)
    s.mu.Unlock()

    return model.StatusSnapshot{
        TimeNow:       time.Now(),
        Bots:          bots,
        PendingVIP:    vip,
        PendingNormal: normal,
        CompleteCount: cc,
    }
}

// Close 优雅关闭：取消所有 Bot，关闭队列。
func (s *Scheduler) Close() error {
    s.mu.Lock()
    for _, b := range s.bots {
        b.Cancel()
    }
    s.mu.Unlock()
    _ = s.q.Close()
    return nil
}

// formatTS 返回统一的 HH:MM:SS 字符串（本地时区）。
func (s *Scheduler) formatTS(t time.Time) string { return t.Format("15:04:05") }

// FormatStatus 将快照格式化为单行简要信息。
func FormatStatus(snap model.StatusSnapshot) string {
    return fmt.Sprintf("VIP:%d NORMAL:%d COMPLETE:%d BOTS:%d", len(snap.PendingVIP), len(snap.PendingNormal), snap.CompleteCount, len(snap.Bots))
}
