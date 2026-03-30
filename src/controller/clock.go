package controller

import (
	"time"

	"github.com/benbjohnson/clock"
)

// Clock 时钟接口
type Clock interface {
	Now() time.Time
	After(d time.Duration) <-chan time.Time
	Sleep(d time.Duration)
}

// RealClock 真实时钟
type RealClock struct{}

func (RealClock) Now() time.Time                      { return time.Now() }
func (RealClock) After(d time.Duration) <-chan time.Time { return time.After(d) }
func (RealClock) Sleep(d time.Duration)                { time.Sleep(d) }

// MockClock 模拟时钟
type MockClock struct {
	Clk *clock.Mock
}

func NewMockClock() *MockClock { return &MockClock{Clk: clock.NewMock()} }
func (m *MockClock) Now() time.Time                      { return m.Clk.Now() }
func (m *MockClock) After(d time.Duration) <-chan time.Time { return m.Clk.After(d) }
func (m *MockClock) Sleep(d time.Duration)                { m.Clk.Add(d) }
func (m *MockClock) Add(d time.Duration)                  { m.Clk.Add(d) }
