package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/domain"
)

// Memory 实现 DESIGN 4.2 内存订单表 + VIP/Normal 双子队列 + Acquire 唤醒。
type Memory struct {
	mu sync.Mutex

	seq         domain.OrderIDSeq
	orders      map[domain.OrderID]*domain.Order
	pendingVIP  []domain.OrderID
	pendingNorm []domain.OrderID

	wake chan struct{}
}

// NewMemory 构造空仓储。
func NewMemory() *Memory {
	return &Memory{
		orders: make(map[domain.OrderID]*domain.Order),
		wake:   make(chan struct{}, 1),
	}
}

func (m *Memory) notify() {
	select {
	case m.wake <- struct{}{}:
	default:
	}
}

func cloneOrder(o *domain.Order) *domain.Order {
	if o == nil {
		return nil
	}
	c := *o
	if o.BotID != nil {
		b := *o.BotID
		c.BotID = &b
	}
	return &c
}

// NextOrderID 下一个订单号（README 单调递增）。
func (m *Memory) NextOrderID() domain.OrderID {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.seq.Next()
}

// SaveOrder 覆盖写入订单。
func (m *Memory) SaveOrder(o *domain.Order) {
	if o == nil {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.orders[o.ID] = cloneOrder(o)
}

// GetOrder 返回订单副本；不存在则 ErrNotFound。
func (m *Memory) GetOrder(id domain.OrderID) (*domain.Order, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.orders[id]
	if !ok {
		return nil, ErrNotFound
	}
	return cloneOrder(o), nil
}

// EnqueuePending 将已存在的 pending 订单追加到子队列尾部。
func (m *Memory) EnqueuePending(tier domain.Tier, id domain.OrderID) error {
	m.mu.Lock()
	err := m.enqueuePendingLocked(tier, id)
	m.mu.Unlock()
	if err == nil {
		m.notify()
	}
	return err
}

func (m *Memory) enqueuePendingLocked(tier domain.Tier, id domain.OrderID) error {
	o, ok := m.orders[id]
	if !ok {
		return ErrNotFound
	}
	if o.Status != domain.OrderPending {
		return ErrNotPending
	}
	if o.Tier != tier {
		return ErrTierMismatch
	}
	if m.containsPendingLocked(id) {
		return ErrAlreadyQueued
	}
	switch tier {
	case domain.TierVIP:
		m.pendingVIP = append(m.pendingVIP, id)
	case domain.TierNormal:
		m.pendingNorm = append(m.pendingNorm, id)
	default:
		return ErrInvalidTier
	}
	return nil
}

// CreatePendingOrder 分配 ID、落库并入队。
func (m *Memory) CreatePendingOrder(tier domain.Tier) (*domain.Order, error) {
	m.mu.Lock()
	id := m.seq.Next()
	now := time.Now()
	o := &domain.Order{ID: id, Tier: tier, Status: domain.OrderPending, CreatedAt: now}
	m.orders[id] = cloneOrder(o)
	err := m.enqueuePendingLocked(tier, id)
	if err != nil {
		delete(m.orders, id)
		m.mu.Unlock()
		return nil, err
	}
	out := cloneOrder(m.orders[id])
	m.mu.Unlock()
	m.notify()
	return out, nil
}

func (m *Memory) tryAssignLocked(botID domain.BotID) (*domain.Order, bool) {
	fromVIP, has := domain.DequeuePeek(len(m.pendingVIP), len(m.pendingNorm))
	if !has {
		return nil, false
	}
	var tier domain.Tier
	var id domain.OrderID
	var idx int
	if fromVIP {
		idx = 0
		id = m.pendingVIP[0]
		m.pendingVIP = m.pendingVIP[1:]
		tier = domain.TierVIP
	} else {
		idx = 0
		id = m.pendingNorm[0]
		m.pendingNorm = m.pendingNorm[1:]
		tier = domain.TierNormal
	}
	o := m.orders[id]
	if o == nil {
		panic("memory: pending queue references missing order")
	}
	if err := o.StartProcessing(botID, tier, idx); err != nil {
		panic("memory: StartProcessing: " + err.Error())
	}
	return o, true
}

// AssignNextToBot 尝试将队头一单分配给 bot；无单则 ok=false（不阻塞）。
func (m *Memory) AssignNextToBot(botID domain.BotID) (*domain.Order, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.tryAssignLocked(botID)
	if !ok {
		return nil, false
	}
	return cloneOrder(o), true
}

// AcquireNext 阻塞直到 ctx 结束或成功分配到一单。
func (m *Memory) AcquireNext(ctx context.Context, botID domain.BotID) (*domain.Order, error) {
	stop := context.AfterFunc(ctx, func() { m.notify() })
	defer stop()
	for {
		m.mu.Lock()
		o, ok := m.tryAssignLocked(botID)
		if ok {
			out := cloneOrder(o)
			m.mu.Unlock()
			return out, nil
		}
		m.mu.Unlock()
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-m.wake:
		}
	}
}

// CompleteOrder 将 processing 订单标为 complete（须匹配 botID）。
func (m *Memory) CompleteOrder(id domain.OrderID, botID domain.BotID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.orders[id]
	if !ok {
		return ErrNotFound
	}
	if o.Status != domain.OrderProcessing || o.BotID == nil || *o.BotID != botID {
		return ErrConflict
	}
	if err := o.Complete(); err != nil {
		return err
	}
	m.notify()
	return nil
}

// CancelAndRequeue -Bot 路径：取消处理并插回原 pending 位置。
func (m *Memory) CancelAndRequeue(id domain.OrderID, botID domain.BotID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.orders[id]
	if !ok {
		return ErrNotFound
	}
	if o.Status != domain.OrderProcessing || o.BotID == nil || *o.BotID != botID {
		return ErrConflict
	}
	if err := o.CancelProcessingToPending(); err != nil {
		return err
	}
	if m.containsPendingLocked(id) {
		return ErrAlreadyQueued
	}
	tier := o.PendingTier
	idx := domain.RequeueInsertIndex(m.tierLenLocked(tier), o.PendingIndex)
	switch tier {
	case domain.TierVIP:
		m.pendingVIP = insertIDAt(m.pendingVIP, idx, id)
	case domain.TierNormal:
		m.pendingNorm = insertIDAt(m.pendingNorm, idx, id)
	default:
		return ErrInvalidTier
	}
	m.notify()
	return nil
}

func (m *Memory) tierLenLocked(tier domain.Tier) int {
	switch tier {
	case domain.TierVIP:
		return len(m.pendingVIP)
	case domain.TierNormal:
		return len(m.pendingNorm)
	default:
		return 0
	}
}

// FailToException 将 processing 订单标为 exception。
func (m *Memory) FailToException(id domain.OrderID, botID domain.BotID, kind domain.ExceptionKind, code, msg string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.orders[id]
	if !ok {
		return ErrNotFound
	}
	if o.Status != domain.OrderProcessing || o.BotID == nil || *o.BotID != botID {
		return ErrConflict
	}
	if err := o.FailToException(kind, code, msg); err != nil {
		return err
	}
	m.notify()
	return nil
}

// RetryExceptionToPending 将 exception 订单回到 pending 并入同级队尾。
func (m *Memory) RetryExceptionToPending(id domain.OrderID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.orders[id]
	if !ok {
		return ErrNotFound
	}
	if o.Status != domain.OrderException {
		return ErrNotPending
	}
	if err := o.RetryFromExceptionToPending(); err != nil {
		return err
	}
	tier := o.Tier
	if m.containsPendingLocked(id) {
		return ErrAlreadyQueued
	}
	switch tier {
	case domain.TierVIP:
		m.pendingVIP = append(m.pendingVIP, id)
	case domain.TierNormal:
		m.pendingNorm = append(m.pendingNorm, id)
	default:
		return ErrInvalidTier
	}
	m.notify()
	return nil
}

// RequeueToPending 将已是 pending 的订单插入子队列（不含 Cancel；用于手工路径）。
func (m *Memory) RequeueToPending(id domain.OrderID, tier domain.Tier, indexInTier int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.orders[id]
	if !ok {
		return ErrNotFound
	}
	if o.Status != domain.OrderPending {
		return ErrNotPending
	}
	if m.containsPendingLocked(id) {
		return ErrAlreadyQueued
	}
	switch tier {
	case domain.TierVIP:
		idx := domain.RequeueInsertIndex(len(m.pendingVIP), indexInTier)
		m.pendingVIP = insertIDAt(m.pendingVIP, idx, id)
	case domain.TierNormal:
		idx := domain.RequeueInsertIndex(len(m.pendingNorm), indexInTier)
		m.pendingNorm = insertIDAt(m.pendingNorm, idx, id)
	default:
		return ErrInvalidTier
	}
	m.notify()
	return nil
}

// DequeueNext 兼容 P2 测试：使用固定 BotID 7 分配队头一单。
func (m *Memory) DequeueNext() (id domain.OrderID, tier domain.Tier, ok bool) {
	const legacyBot = domain.BotID(7)
	o, ok := m.AssignNextToBot(legacyBot)
	if !ok {
		return 0, 0, false
	}
	return o.ID, o.PendingTier, true
}

// ListByStatus 返回该状态下订单快照（pending 按子队列顺序）。
func (m *Memory) ListByStatus(st domain.OrderStatus) []*domain.Order {
	m.mu.Lock()
	defer m.mu.Unlock()
	switch st {
	case domain.OrderPending:
		out := make([]*domain.Order, 0, len(m.pendingVIP)+len(m.pendingNorm))
		for _, id := range m.pendingVIP {
			if o := m.orders[id]; o != nil && o.Status == domain.OrderPending {
				out = append(out, cloneOrder(o))
			}
		}
		for _, id := range m.pendingNorm {
			if o := m.orders[id]; o != nil && o.Status == domain.OrderPending {
				out = append(out, cloneOrder(o))
			}
		}
		return out
	default:
		var out []*domain.Order
		for _, o := range m.orders {
			if o.Status == st {
				out = append(out, cloneOrder(o))
			}
		}
		sortOrdersStable(st, out)
		return out
	}
}

// sortOrdersStable 消除 map 遍历顺序随机性；complete 按完成时间新→旧。
func sortOrdersStable(st domain.OrderStatus, out []*domain.Order) {
	sort.Slice(out, func(i, j int) bool {
		a, b := out[i], out[j]
		switch st {
		case domain.OrderProcessing:
			az, bz := a.StartedAt.IsZero(), b.StartedAt.IsZero()
			if az && bz {
				return a.ID < b.ID
			}
			if az {
				return false
			}
			if bz {
				return true
			}
			if !a.StartedAt.Equal(b.StartedAt) {
				return a.StartedAt.Before(b.StartedAt)
			}
			return a.ID < b.ID
		case domain.OrderComplete:
			az, bz := a.CompletedAt.IsZero(), b.CompletedAt.IsZero()
			if az && bz {
				return a.ID > b.ID
			}
			if az {
				return false
			}
			if bz {
				return true
			}
			if !a.CompletedAt.Equal(b.CompletedAt) {
				return a.CompletedAt.After(b.CompletedAt)
			}
			return a.ID > b.ID
		default:
			return a.ID < b.ID
		}
	})
}

func (m *Memory) containsPendingLocked(id domain.OrderID) bool {
	for _, x := range m.pendingVIP {
		if x == id {
			return true
		}
	}
	for _, x := range m.pendingNorm {
		if x == id {
			return true
		}
	}
	return false
}

func insertIDAt(s []domain.OrderID, i int, id domain.OrderID) []domain.OrderID {
	if i < 0 {
		i = 0
	}
	if i > len(s) {
		i = len(s)
	}
	s = append(s, 0)
	copy(s[i+1:], s[i:])
	s[i] = id
	return s
}
