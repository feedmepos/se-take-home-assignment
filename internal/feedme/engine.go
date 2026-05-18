package feedme

import (
	"context"
	"sort"
	"sync"
	"time"
)

// Engine 为订单与机器人调度核心（内存态、线程安全）。
type Engine struct {
	mu sync.Mutex

	nextOrderID int64
	nextBotID   int64

	orders map[int64]*Order

	vipPending    []int64
	normalPending []int64
	complete      []int64

	bots []*botState

	processDur time.Duration
}

type botState struct {
	id      int64
	orderID int64 // 0 表示空闲
	cancel  context.CancelFunc
	wg      sync.WaitGroup
}

// NewEngine 创建引擎；processDur 小于等于 0 时使用 10 秒。
func NewEngine(processDur time.Duration) *Engine {
	if processDur <= 0 {
		processDur = 10 * time.Second
	}
	return &Engine{
		orders:     make(map[int64]*Order),
		processDur: processDur,
	}
}

// ProcessDuration 返回当前每单处理时长（用于测试/配置展示）。
func (e *Engine) ProcessDuration() time.Duration {
	return e.processDur
}

// AddOrder 创建订单并入 PENDING 队列，随后尝试调度。
func (e *Engine) AddOrder(kind OrderKind) (int64, error) {
	if kind != KindNormal && kind != KindVIP {
		return 0, ErrInvalidKind
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	e.nextOrderID++
	id := e.nextOrderID
	o := &Order{ID: id, Kind: kind, Status: StatusPending}
	e.orders[id] = o
	if kind == KindVIP {
		e.vipPending = append(e.vipPending, id)
	} else {
		e.normalPending = append(e.normalPending, id)
	}
	e.scheduleLocked()
	return id, nil
}

// AddBot 追加一台机器人并按 id 升序尝试派单。
func (e *Engine) AddBot() int64 {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.nextBotID++
	bid := e.nextBotID
	e.bots = append(e.bots, &botState{id: bid})
	e.scheduleLocked()
	return bid
}

// RemoveNewestBot 移除 id 最大的机器人；若处理中则取消并将订单按 id 升序插回对应子队列。
func (e *Engine) RemoveNewestBot() error {
	e.mu.Lock()
	if len(e.bots) == 0 {
		e.mu.Unlock()
		return ErrNoBot
	}
	idx := e.indexOfMaxBotID()
	b := e.bots[idx]
	bid := b.id
	oid := b.orderID
	var cancel context.CancelFunc
	if oid != 0 {
		cancel = b.cancel
	}
	e.mu.Unlock()

	if cancel != nil {
		cancel()
		b.wg.Wait()
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	idx = e.botIndexByID(bid)
	if idx < 0 {
		return nil
	}
	if oid != 0 {
		o := e.orders[oid]
		if o != nil && o.Status == StatusProcessing {
			o.Status = StatusPending
			if o.Kind == KindVIP {
				e.vipPending = insertSortedAsc(e.vipPending, oid)
			} else {
				e.normalPending = insertSortedAsc(e.normalPending, oid)
			}
		}
	}
	e.bots = append(e.bots[:idx], e.bots[idx+1:]...)
	e.scheduleLocked()
	return nil
}

func (e *Engine) botIndexByID(id int64) int {
	for i, b := range e.bots {
		if b.id == id {
			return i
		}
	}
	return -1
}

func (e *Engine) indexOfMaxBotID() int {
	maxID := int64(-1)
	best := 0
	for i, b := range e.bots {
		if b.id >= maxID {
			maxID = b.id
			best = i
		}
	}
	return best
}

func insertSortedAsc(s []int64, id int64) []int64 {
	i := sort.Search(len(s), func(i int) bool { return s[i] >= id })
	s = append(s, 0)
	copy(s[i+1:], s[i:])
	s[i] = id
	return s
}

func (e *Engine) dequeueNextLocked() int64 {
	if len(e.vipPending) > 0 {
		id := e.vipPending[0]
		e.vipPending = e.vipPending[1:]
		return id
	}
	if len(e.normalPending) > 0 {
		id := e.normalPending[0]
		e.normalPending = e.normalPending[1:]
		return id
	}
	return 0
}

// scheduleLocked 在持有 e.mu 的前提下，按 bot id 升序给空闲 bot 派单。
func (e *Engine) scheduleLocked() {
	for _, b := range e.bots {
		if b.orderID != 0 {
			continue
		}
		next := e.dequeueNextLocked()
		if next == 0 {
			return
		}
		o := e.orders[next]
		o.Status = StatusProcessing
		b.orderID = next
		ctx, cancel := context.WithCancel(context.Background())
		b.cancel = cancel
		b.wg.Add(1)
		botID := b.id
		orderID := next
		dur := e.processDur
		go e.runProcess(botID, orderID, ctx, dur)
	}
}

func (e *Engine) runProcess(botID, orderID int64, ctx context.Context, dur time.Duration) {
	var bRef *botState
	defer func() {
		e.mu.Lock()
		if bRef == nil {
			bRef = e.botByID(botID)
		}
		if bRef != nil {
			bRef.wg.Done()
		}
		e.mu.Unlock()
	}()

	timer := time.NewTimer(dur)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return
	case <-timer.C:
	}
	if ctx.Err() != nil {
		return
	}

	e.mu.Lock()
	bRef = e.botByID(botID)
	if bRef == nil || bRef.orderID != orderID {
		e.mu.Unlock()
		return
	}
	o := e.orders[orderID]
	if o == nil || o.Status != StatusProcessing {
		e.mu.Unlock()
		return
	}
	o.Status = StatusComplete
	e.complete = append(e.complete, orderID)
	bRef.orderID = 0
	bRef.cancel = nil
	e.scheduleLocked()
	e.mu.Unlock()
}

func (e *Engine) botByID(id int64) *botState {
	for _, b := range e.bots {
		if b.id == id {
			return b
		}
	}
	return nil
}

// Snapshot 返回当前状态快照（用于 API）。
func (e *Engine) Snapshot() State {
	e.mu.Lock()
	defer e.mu.Unlock()

	st := State{
		Pending:    make([]Order, 0, len(e.vipPending)+len(e.normalPending)),
		Processing: nil,
		Complete:   nil,
		Bots:       make([]BotSnapshot, 0, len(e.bots)),
	}

	for _, id := range e.vipPending {
		if o := e.orders[id]; o != nil {
			st.Pending = append(st.Pending, *o)
		}
	}
	for _, id := range e.normalPending {
		if o := e.orders[id]; o != nil {
			st.Pending = append(st.Pending, *o)
		}
	}

	// processing：由 bot 推导，顺序按 bot id
	botsSorted := append([]*botState(nil), e.bots...)
	sort.Slice(botsSorted, func(i, j int) bool { return botsSorted[i].id < botsSorted[j].id })
	var proc []Order
	for _, b := range botsSorted {
		if b.orderID != 0 {
			if o := e.orders[b.orderID]; o != nil {
				proc = append(proc, *o)
			}
		}
		st.Bots = append(st.Bots, BotSnapshot{
			ID:      b.id,
			Idle:    b.orderID == 0,
			OrderID: b.orderID,
		})
	}
	st.Processing = proc

	for _, id := range e.complete {
		if o := e.orders[id]; o != nil {
			st.Complete = append(st.Complete, *o)
		}
	}

	return st
}
