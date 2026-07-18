package utils

import "sync/atomic"

// IDGenerator 线程安全的 ID 生成器
type IDGenerator struct {
	next int64
}

// New 创建一个从 start 开始计数的 ID 生成器
func New(start int) *IDGenerator {
	return &IDGenerator{next: int64(start)}
}

// Next 返回下一个 ID 并原子自增，线程安全
func (g *IDGenerator) Next() int {
	return int(atomic.AddInt64(&g.next, 1) - 1)
}
