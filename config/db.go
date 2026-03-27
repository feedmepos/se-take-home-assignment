package config

import (
	"se-take-home/model"
	"sync"
)

var (
	OrdersPending  []model.Order
	OrdersFinished []model.Order
	OrderNoSeed    = 1
	OrdersLock     sync.Mutex
	Robots         []*Robot
	RobotIdSeed    = 1
)

type Robot struct {
	ID        int
	Working   bool
	StopChan  chan struct{}
	// 正在处理的订单在pending中的原始索引
	OrderIdx  int
}

func InitDB() {
	OrdersPending = make([]model.Order, 0)
	OrdersFinished = make([]model.Order, 0)
	Robots = make([]*Robot, 0)
}
