package sim

import (
	"bytes"
	"sync"
	"testing"
	"time"
)

type fakeClock struct {
	mu      sync.Mutex
	current time.Time
}

func newFakeClock() *fakeClock {
	return &fakeClock{current: time.Date(2026, 4, 10, 14, 32, 0, 0, time.UTC)}
}

func (f *fakeClock) Now() time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.current
}

func (f *fakeClock) Sleep(d time.Duration) {
	// Keep test runtime behavior realistic for goroutine scheduling.
	time.Sleep(d)
	f.mu.Lock()
	f.current = f.current.Add(d)
	f.mu.Unlock()
}

type expectedResult struct {
	botCount      int
	completedTask int
	totalUsedTime int
	normalCount   int
	vipCount      int
	activeCount   int
	processing    int
	pending       int
}

type testStruct struct {
	name           string
	normalDelay    time.Duration
	fastDelay      time.Duration
	steps          func(t *testing.T, e *Engine)
	expectedResult expectedResult
}

func TestEngineScenarios(t *testing.T) {
	testcases := []testStruct{
		{
			name:        "vip priority with two bots",
			normalDelay: 30 * time.Millisecond,
			fastDelay:   20 * time.Millisecond,
			steps: func(t *testing.T, e *Engine) {
				e.NewOrder(Normal)
				e.NewOrder(VIP)
				e.NewOrder(Normal)
				e.AddBot(NormalBot)
				e.AddBot(FastBot)

				waitUntil(t, 400*time.Millisecond, func() bool {
					return e.CompletedCount() == 3
				})

				// Stop bots so fake clock does not keep advancing on idle loops.
				e.RemoveNewestBot()
				e.RemoveNewestBot()
			},
			expectedResult: expectedResult{
				botCount:      0,
				completedTask: 3,
				totalUsedTime: 60,
				normalCount:   2,
				vipCount:      1,
				activeCount:   0,
				processing:    0,
				pending:       0,
			},
		},
		{
			name:        "remove bot while processing",
			normalDelay: 200 * time.Millisecond,
			fastDelay:   140 * time.Millisecond,
			steps: func(t *testing.T, e *Engine) {
				e.NewOrder(VIP)
				e.AddBot(NormalBot)
				waitUntil(t, 80*time.Millisecond, func() bool {
					s := e.Snapshot()
					return len(s.ActiveTasks) == 1 && s.ActiveTasks[0].Status == Processing
				})
				e.RemoveNewestBot()
			},
			expectedResult: expectedResult{
				botCount:      0,
				completedTask: 0,
				totalUsedTime: 20,
				normalCount:   0,
				vipCount:      1,
				activeCount:   1,
				processing:    0,
				pending:       1,
			},
		},
		{
			name:        "middle status",
			normalDelay: 200 * time.Millisecond,
			fastDelay:   140 * time.Millisecond,
			steps: func(t *testing.T, e *Engine) {
				e.NewOrder(VIP)
				e.NewOrder(Normal)
				e.NewOrder(Normal)
				e.AddBot(NormalBot)
				e.AddBot(FastBot)
				waitUntil(t, 80*time.Millisecond, func() bool {
					s := e.Snapshot()
					return countByStatus(s.ActiveTasks, Processing) == 2 && len(s.ActiveTasks) == 3
				})
			},
			expectedResult: expectedResult{
				botCount:      0,
				completedTask: 0,
				totalUsedTime: 20,
				normalCount:   2,
				vipCount:      1,
				activeCount:   3,
				processing:    0,
				pending:       3,
			},
		},
	}

	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			clock := newFakeClock()
			start := clock.Now()
			var out bytes.Buffer
			normalDelay := tc.normalDelay
			if normalDelay == 0 {
				normalDelay = 30 * time.Millisecond
			}
			fastDelay := tc.fastDelay
			if fastDelay == 0 {
				fastDelay = 20 * time.Millisecond
			}
			engine := NewEngine(clock, &out, normalDelay, fastDelay)

			tc.steps(t, engine)
			// Single stop function for every testcase:
			// stop all bots first, then validate frozen status.
			s := stopAndFreeze(engine)
			normalTotal, vipTotal := totalTypeCount(s)
			totalUsedMS := int(clock.Now().Sub(start).Milliseconds())

			if len(s.Bots) != tc.expectedResult.botCount {
				t.Fatalf("expected botCount=%d, got %d", tc.expectedResult.botCount, len(s.Bots))
			}
			if len(s.CompletedTasks) != tc.expectedResult.completedTask {
				t.Fatalf("expected completedTask=%d, got %d", tc.expectedResult.completedTask, len(s.CompletedTasks))
			}
			if normalTotal != tc.expectedResult.normalCount {
				t.Fatalf("expected normalCount=%d, got %d", tc.expectedResult.normalCount, normalTotal)
			}
			if vipTotal != tc.expectedResult.vipCount {
				t.Fatalf("expected vipCount=%d, got %d", tc.expectedResult.vipCount, vipTotal)
			}
			if len(s.ActiveTasks) != tc.expectedResult.activeCount {
				t.Fatalf("expected activeCount=%d, got %d", tc.expectedResult.activeCount, len(s.ActiveTasks))
			}
			if countByStatus(s.ActiveTasks, Processing) != tc.expectedResult.processing {
				t.Fatalf("expected processing=%d, got %d", tc.expectedResult.processing, countByStatus(s.ActiveTasks, Processing))
			}
			if countByStatus(s.ActiveTasks, Pending) != tc.expectedResult.pending {
				t.Fatalf("expected pending=%d, got %d", tc.expectedResult.pending, countByStatus(s.ActiveTasks, Pending))
			}
			// Timing can vary slightly due to goroutine scheduling; assert minimum.
			if totalUsedMS < tc.expectedResult.totalUsedTime {
				t.Fatalf("expected totalUsedTime >= %dms, got %dms", tc.expectedResult.totalUsedTime, totalUsedMS)
			}
		})
	}
}

func TestBotTypeProcessingSpeed(t *testing.T) {
	clock := newFakeClock()
	var out bytes.Buffer
	engine := NewEngine(clock, &out, 100*time.Millisecond, 70*time.Millisecond)

	engine.NewOrder(Normal)
	engine.AddBot(NormalBot)
	waitUntil(t, 300*time.Millisecond, func() bool {
		return engine.CompletedCount() == 1
	})
	engine.RemoveNewestBot()
	normalElapsed := clock.Now().Sub(time.Date(2026, 4, 10, 14, 32, 0, 0, time.UTC))

	clock = newFakeClock()
	out.Reset()
	engine = NewEngine(clock, &out, 100*time.Millisecond, 70*time.Millisecond)
	engine.NewOrder(Normal)
	engine.AddBot(FastBot)
	waitUntil(t, 300*time.Millisecond, func() bool {
		return engine.CompletedCount() == 1
	})
	engine.RemoveNewestBot()
	fastElapsed := clock.Now().Sub(time.Date(2026, 4, 10, 14, 32, 0, 0, time.UTC))

	if fastElapsed >= normalElapsed {
		t.Fatalf("expected fast bot to complete sooner than normal bot, normal=%v fast=%v", normalElapsed, fastElapsed)
	}
	if normalElapsed < 100*time.Millisecond {
		t.Fatalf("expected normal bot runtime >= 100ms, got %v", normalElapsed)
	}
	if fastElapsed < 70*time.Millisecond {
		t.Fatalf("expected fast bot runtime >= 70ms, got %v", fastElapsed)
	}
}

func stopAndFreeze(e *Engine) Snapshot {
	for e.RemoveNewestBot() {
	}
	return e.Snapshot()
}

func countByStatus(tasks []TaskStatus, status OrderStatus) int {
	count := 0
	for _, t := range tasks {
		if t.Status == status {
			count++
		}
	}
	return count
}

func totalTypeCount(s Snapshot) (normal int, vip int) {
	for _, t := range s.ActiveTasks {
		if t.Type == Normal {
			normal++
		}
		if t.Type == VIP {
			vip++
		}
	}
	for _, t := range s.CompletedTasks {
		if t.Type == Normal {
			normal++
		}
		if t.Type == VIP {
			vip++
		}
	}
	return normal, vip
}

func waitUntil(t *testing.T, timeout time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("condition not met within %v", timeout)
}
