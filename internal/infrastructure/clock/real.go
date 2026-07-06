// Package clock 提供 port.Clock 的生产实现与测试用 Mock 实现。
package clock

import (
	"time"

	"github.com/lijian-bj/se-take-home-assignment/internal/application/port"
)

// Real 是生产环境时钟，委托标准库 time 包。
type Real struct{}

func (Real) Now() time.Time {
	return time.Now()
}

func (Real) AfterFunc(d time.Duration, f func()) port.TimerHandle {
	return time.AfterFunc(d, f)
}
