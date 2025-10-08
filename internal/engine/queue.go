package engine

import (
    "container/list"
    "context"
    "errors"
    "sync"

    "se-take-home-assignment/internal/model"
)

// ErrQueueClosed 当队列已关闭且无可取元素时返回该错误。
var ErrQueueClosed = errors.New("priority queue closed")

// PriorityDequeQueue 是带锁的“优先级双端队列”。
// - 内含两个 deque：VIP 与 Normal；均支持头/尾插入。
// - 优先级出队：总是先取 VIP 头部，若空再取 Normal 头部。
// - 提供阻塞式 WaitAndDequeuePriority(ctx) 与非阻塞 DequeuePriority()。
// - 使用单一互斥量与条件变量，保证跨队列原子性与等待/唤醒。
type PriorityDequeQueue struct {
    mu      sync.Mutex
    notEmpty *sync.Cond

    vip    *list.List // list of model.OrderRef
    normal *list.List // list of model.OrderRef

    closed bool
}

// NewPriorityDequeQueue 创建队列实例。
func NewPriorityDequeQueue() *PriorityDequeQueue {
    q := &PriorityDequeQueue{
        vip:    list.New(),
        normal: list.New(),
    }
    q.notEmpty = sync.NewCond(&q.mu)
    return q
}

// EnqueueVIPBack 将订单追加到 VIP 队尾（新创建的 VIP）。
func (q *PriorityDequeQueue) EnqueueVIPBack(o model.OrderRef) error {
    q.mu.Lock()
    defer q.mu.Unlock()
    if q.closed {
        return ErrQueueClosed
    }
    wasEmpty := q.vip.Len()+q.normal.Len() == 0
    q.vip.PushBack(o)
    if wasEmpty {
        q.notEmpty.Broadcast()
    }
    return nil
}

// EnqueueVIPFront 将订单插入到 VIP 队头（处理中断回队）。
func (q *PriorityDequeQueue) EnqueueVIPFront(o model.OrderRef) error {
    q.mu.Lock()
    defer q.mu.Unlock()
    if q.closed {
        return ErrQueueClosed
    }
    wasEmpty := q.vip.Len()+q.normal.Len() == 0
    q.vip.PushFront(o)
    if wasEmpty {
        q.notEmpty.Broadcast()
    }
    return nil
}

// EnqueueNormalBack 将订单追加到 Normal 队尾（新创建的 Normal）。
func (q *PriorityDequeQueue) EnqueueNormalBack(o model.OrderRef) error {
    q.mu.Lock()
    defer q.mu.Unlock()
    if q.closed {
        return ErrQueueClosed
    }
    wasEmpty := q.vip.Len()+q.normal.Len() == 0
    q.normal.PushBack(o)
    if wasEmpty {
        q.notEmpty.Broadcast()
    }
    return nil
}

// EnqueueNormalFront 将订单插入到 Normal 队头（处理中断回队）。
func (q *PriorityDequeQueue) EnqueueNormalFront(o model.OrderRef) error {
    q.mu.Lock()
    defer q.mu.Unlock()
    if q.closed {
        return ErrQueueClosed
    }
    wasEmpty := q.vip.Len()+q.normal.Len() == 0
    q.normal.PushFront(o)
    if wasEmpty {
        q.notEmpty.Broadcast()
    }
    return nil
}

// popPriority 在锁内执行，弹出一个优先订单；若无则返回 false。
func (q *PriorityDequeQueue) popPriority() (model.OrderRef, bool) {
    if e := q.vip.Front(); e != nil {
        q.vip.Remove(e)
        return e.Value.(model.OrderRef), true
    }
    if e := q.normal.Front(); e != nil {
        q.normal.Remove(e)
        return e.Value.(model.OrderRef), true
    }
    return model.OrderRef{}, false
}

// DequeuePriority 非阻塞优先级出队：先 VIP 头，再 Normal 头；若全空返回 false。
func (q *PriorityDequeQueue) DequeuePriority() (model.OrderRef, bool) {
    q.mu.Lock()
    defer q.mu.Unlock()
    return q.popPriority()
}

// WaitAndDequeuePriority 阻塞式优先级出队：直到队列非空、队列关闭或 ctx 取消。
// 为了让 ctx 可生效，调用方在取消时应调用 WakeAll() 唤醒等待者，使其检查 ctx 并返回。
func (q *PriorityDequeQueue) WaitAndDequeuePriority(ctx context.Context) (model.OrderRef, error) {
    q.mu.Lock()
    defer q.mu.Unlock()

    for {
        if ctx.Err() != nil {
            return model.OrderRef{}, ctx.Err()
        }
        if o, ok := q.popPriority(); ok {
            return o, nil
        }
        if q.closed {
            return model.OrderRef{}, ErrQueueClosed
        }
        q.notEmpty.Wait()
    }
}

// LenVIP 返回 VIP 队列长度。
func (q *PriorityDequeQueue) LenVIP() int {
    q.mu.Lock()
    defer q.mu.Unlock()
    return q.vip.Len()
}

// LenNormal 返回 Normal 队列长度。
func (q *PriorityDequeQueue) LenNormal() int {
    q.mu.Lock()
    defer q.mu.Unlock()
    return q.normal.Len()
}

// LenTotal 返回总长度。
func (q *PriorityDequeQueue) LenTotal() int {
    q.mu.Lock()
    defer q.mu.Unlock()
    return q.vip.Len() + q.normal.Len()
}

// IsEmpty 判断两队列是否均为空。
func (q *PriorityDequeQueue) IsEmpty() bool {
    q.mu.Lock()
    defer q.mu.Unlock()
    return q.vip.Len() == 0 && q.normal.Len() == 0
}

// Snapshot 返回两个队列的只读拷贝，用于 status 展示。
func (q *PriorityDequeQueue) Snapshot() (vip []model.OrderRef, normal []model.OrderRef) {
    q.mu.Lock()
    defer q.mu.Unlock()
    vip = make([]model.OrderRef, 0, q.vip.Len())
    for e := q.vip.Front(); e != nil; e = e.Next() {
        vip = append(vip, e.Value.(model.OrderRef))
    }
    normal = make([]model.OrderRef, 0, q.normal.Len())
    for e := q.normal.Front(); e != nil; e = e.Next() {
        normal = append(normal, e.Value.(model.OrderRef))
    }
    return vip, normal
}

// Close 关闭队列：唤醒所有等待者，使其及时退出。
func (q *PriorityDequeQueue) Close() error {
    q.mu.Lock()
    defer q.mu.Unlock()
    if q.closed {
        return nil
    }
    q.closed = true
    q.notEmpty.Broadcast()
    return nil
}

// WakeAll 显式唤醒所有等待出队的 goroutine（用于取消/缩容时触发 Wait 检查 ctx）。
func (q *PriorityDequeQueue) WakeAll() {
    q.mu.Lock()
    q.notEmpty.Broadcast()
    q.mu.Unlock()
}
