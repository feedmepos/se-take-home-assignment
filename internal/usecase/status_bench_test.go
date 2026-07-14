package usecase_test

import (
	"testing"
	"time"

	"feedme-order-controller/internal/core"
	"feedme-order-controller/internal/repository/memory"
	"feedme-order-controller/internal/usecase"
)

// benchLogger discards all log lines so the benchmark measures Status()
// itself, not log formatting.
type benchLogger struct{}

func (benchLogger) Logf(string, ...any) {}

// benchClock returns a fixed instant; Status() does not consult the clock,
// but the constructor requires one.
type benchClock struct{}

func (benchClock) Now() time.Time { return time.Time{} }

// BenchmarkStatus measures a status read against the real in-memory
// repositories with a large completed history (10k orders) and a modest
// pending queue (100 orders) — the shape a long-running process converges
// to. The benchmark name is kept stable across the completed-counters
// refactor so benchstat can compare before/after.
func BenchmarkStatus(b *testing.B) {
	orders := memory.NewOrderRepository()
	bots := memory.NewBotRegistry()
	u := usecase.New(orders, bots, benchClock{}, benchLogger{}, time.Second)

	for i := 0; i < 10_000; i++ {
		kind := core.Normal
		if i%2 == 0 {
			kind = core.VIP
		}
		orders.Complete(core.Order{ID: orders.NextOrderID(), Kind: kind, Status: core.Processing})
	}
	for i := 0; i < 100; i++ {
		kind := core.Normal
		if i%2 == 0 {
			kind = core.VIP
		}
		orders.Enqueue(core.Order{ID: orders.NextOrderID(), Kind: kind, Status: core.Pending})
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = u.Status()
	}
}
