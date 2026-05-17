package clock

import (
	"context"
	"time"
)

// Clock 可注入时间（DESIGN P3/P4 单测用 Fake）。
type Clock interface {
	Now() time.Time
	Sleep(ctx context.Context, d time.Duration) error
}

// RealClock 使用系统时间。
type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now() }

func (RealClock) Sleep(ctx context.Context, d time.Duration) error {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

// FakeClock 立即结束 Sleep（除非 ctx 已取消）。
type FakeClock struct {
	NowFn func() time.Time
}

func (f FakeClock) Now() time.Time {
	if f.NowFn != nil {
		return f.NowFn()
	}
	return time.Unix(0, 0).UTC()
}

func (FakeClock) Sleep(ctx context.Context, _ time.Duration) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
		return nil
	}
}
