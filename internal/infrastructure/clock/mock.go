package clock

import (
	"container/heap"
	"sync"
	"time"

	"github.com/lijian-bj/se-take-home-assignment/internal/application/port"
)

// mockTimer 是 Mock 时钟内部的定时任务，按 deadline 排序。
type mockTimer struct {
	deadline time.Time
	fn       func()
	index    int // 在最小堆中的索引，-1 表示已取消
}

// timerHeap 实现 container/heap 接口，按 deadline 升序排列定时器。
type timerHeap []*mockTimer

func (h timerHeap) Len() int           { return len(h) }
func (h timerHeap) Less(i, j int) bool { return h[i].deadline.Before(h[j].deadline) }
func (h timerHeap) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
	h[i].index = i
	h[j].index = j
}
func (h *timerHeap) Push(x any) {
	t := x.(*mockTimer)
	t.index = len(*h)
	*h = append(*h, t)
}
func (h *timerHeap) Pop() any {
	old := *h
	n := len(old)
	t := old[n-1]
	old[n-1] = nil
	t.index = -1
	*h = old[:n-1]
	return t
}

// mockTimerHandle 是 Mock 定时器的可取消句柄。
type mockTimerHandle struct {
	clock *Mock
	timer *mockTimer
}

func (h *mockTimerHandle) Stop() bool {
	h.clock.mu.Lock()
	defer h.clock.mu.Unlock()
	if h.timer.index < 0 {
		return false
	}
	heap.Remove(&h.clock.timers, h.timer.index)
	h.timer.index = -1
	return true
}

// Mock 是测试用可控时钟，支持 Advance 快进时间并触发到期定时器。
type Mock struct {
	mu     sync.Mutex
	now    time.Time
	timers timerHeap
}

// NewMock 创建从指定时刻开始的 Mock 时钟。
func NewMock(start time.Time) *Mock {
	return &Mock{now: start}
}

func (m *Mock) Now() time.Time {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.now
}

func (m *Mock) AfterFunc(d time.Duration, f func()) port.TimerHandle {
	m.mu.Lock()
	defer m.mu.Unlock()
	t := &mockTimer{deadline: m.now.Add(d), fn: f}
	heap.Push(&m.timers, t)
	return &mockTimerHandle{clock: m, timer: t}
}

// Advance 将 Mock 时钟快进指定时长，并同步触发所有已到期的定时器回调。
func (m *Mock) Advance(d time.Duration) {
	m.mu.Lock()
	m.now = m.now.Add(d)
	var ready []func()
	// 按 deadline 顺序弹出所有已到期的定时器。
	for m.timers.Len() > 0 && !m.timers[0].deadline.After(m.now) {
		t := heap.Pop(&m.timers).(*mockTimer)
		t.index = -1
		ready = append(ready, t.fn)
	}
	m.mu.Unlock()
	// 回调在锁外执行，避免 AfterFunc → onProcessingComplete 重入死锁。
	for _, fn := range ready {
		fn()
	}
}
