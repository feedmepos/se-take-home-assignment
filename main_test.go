package main

import (
	"testing"
	"time"
)

func Test1(t *testing.T) {
	m := NewManager()
	m.createOrder(false)
	m.createOrder(true)
	m.addBot()
	m.addBot()
	m.createOrder(true)
	m.createOrder(false)
	m.createOrder(true)
	time.Sleep(10 * time.Second)
	m.printStatus()
}

// 基础测试：两个普通订单，一个机器人
func TestNormalOrders(t *testing.T) {
	m := NewManager()
	m.createOrder(false)         // 普通
	m.createOrder(false)         // 普通
	m.addBot()                   // 1 个机器人
	time.Sleep(12 * time.Second) // 等待机器人处理
	m.printStatus()
}

// VIP 优先测试：普通 + VIP 混合，两个机器人
func TestVipPriority(t *testing.T) {
	m := NewManager()
	m.createOrder(false) // 普通
	m.createOrder(false) // 普通
	m.createOrder(true)  // VIP
	m.addBot()
	m.addBot()
	time.Sleep(15 * time.Second)
	m.printStatus()
}

// 多机器人竞争测试：多个订单，多个机器人
func TestMultipleBots(t *testing.T) {
	m := NewManager()
	for i := 0; i < 3; i++ {
		m.createOrder(false) // 普通
	}
	m.createOrder(true) // VIP
	m.createOrder(true) // VIP
	for i := 0; i < 3; i++ {
		m.addBot()
	}
	time.Sleep(20 * time.Second)
	m.printStatus()
}

// 空队列机器人测试：机器人先启动，订单后进入
func TestIdleBots(t *testing.T) {
	m := NewManager()
	m.addBot()
	m.addBot()
	time.Sleep(3 * time.Second) // 先闲置一会
	m.createOrder(true)
	m.createOrder(false)
	time.Sleep(12 * time.Second)
	m.printStatus()
}

func TestRemoveBotDuringProcessing(t *testing.T) {
	m := NewManager()

	m.addBot()
	m.createOrder(false)
	time.Sleep(200 * time.Millisecond)

	// 移除最新 bot（正在处理）
	m.removeBot()

	// 等待短时间，让被移除的 bot 将订单回队列并退出
	time.Sleep(300 * time.Millisecond)

	// 被回退的订单应该在 normalPending 中（长度为1）
	if m.normalPending.Len() != 1 {
		t.Fatalf("expected normalPending len 1 after removing processing bot, got %d", m.normalPending.Len())
	}

	// 启动一个快速 bot 处理被回退的订单
	m.addBot()
	// 等待足够时间让它完成（process 1s）
	time.Sleep(2000 * time.Millisecond)

	// 完成列表应至少包含 1 个订单
	if m.complete.Len() == 0 {
		t.Fatalf("expected at least 1 completed order after reprocessing, got %d", m.complete.Len())
	}

}
