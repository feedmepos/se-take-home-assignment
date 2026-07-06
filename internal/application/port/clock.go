// Package port 定义应用层的驱动端口（Driven Ports），供基础设施层实现。
// 通过接口隔离时钟与日志，使领域层和应用层可在测试中注入 Mock 依赖。
package port

import "time"

// TimerHandle 表示一个可取消的定时器句柄。
type TimerHandle interface {
	Stop() bool
}

// Clock 是可注入的时钟端口，抽象真实时间与测试用 Mock 时间。
type Clock interface {
	Now() time.Time
	AfterFunc(d time.Duration, f func()) TimerHandle
}
