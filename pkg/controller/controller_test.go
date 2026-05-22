package controller

import (
	"testing"
	"time"
)

func Test1(t *testing.T) {
	m := NewManager()
	m.CreateOrder(false)
	m.CreateOrder(true)
	m.AddBot()
	m.AddBot()
	m.CreateOrder(true)
	m.CreateOrder(false)
	m.CreateOrder(true)
	time.Sleep(10 * time.Second)
	m.PrintStatus()
}

// 基础测试：两个普通订单，一个机器人
func TestNormalOrders(t *testing.T) {
	m := NewManager()
	m.CreateOrder(false)         // 普通
	m.CreateOrder(false)         // 普通
	m.AddBot()                   // 1 个机器人
	time.Sleep(12 * time.Second) // 等待机器人处理
	m.PrintStatus()
}

// VIP 优先测试：普通 + VIP 混合，两个机器人
func TestVipPriority(t *testing.T) {
	m := NewManager()
	m.CreateOrder(false) // 普通
	m.CreateOrder(false) // 普通
	m.CreateOrder(true)  // VIP
	m.AddBot()
	m.AddBot()
	time.Sleep(15 * time.Second)
	m.PrintStatus()
}

// 多机器人竞争测试：多个订单，多个机器人
func TestMultipleBots(t *testing.T) {
	m := NewManager()
	for i := 0; i < 3; i++ {
		m.CreateOrder(false) // 普通
	}
	m.CreateOrder(true) // VIP
	m.CreateOrder(true) // VIP
	for i := 0; i < 3; i++ {
		m.AddBot()
	}
	time.Sleep(20 * time.Second)
	m.PrintStatus()
}

// 空队列机器人测试：机器人先启动，订单后进入
func TestIdleBots(t *testing.T) {
	m := NewManager()
	m.AddBot()
	m.AddBot()
	time.Sleep(3 * time.Second) // 先闲置一会
	m.CreateOrder(true)
	m.CreateOrder(false)
	time.Sleep(12 * time.Second)
	m.PrintStatus()
}

func TestRemoveBotDuringProcessing(t *testing.T) {
	m := NewManager()

	m.AddBot()
	m.CreateOrder(false)
	time.Sleep(200 * time.Millisecond)

	// 移除最新 bot（正在处理）
	m.RemoveBot()

	// 等待短时间，让被移除的 bot 将订单回队列并退出
	time.Sleep(300 * time.Millisecond)

	// 被回退的订单应该在 normalPending 中（长度为1）
	if m.normalPending.Len() != 1 {
		t.Fatalf("expected normalPending len 1 after removing processing bot, got %d", m.normalPending.Len())
	}

	// 启动一个快速 bot 处理被回退的订单
	m.AddBot()
	// 等待足够时间让它完成（process 1s）
	time.Sleep(2000 * time.Millisecond)

	// 完成列表应至少包含 1 个订单
	if m.complete.Len() == 0 {
		t.Fatalf("expected at least 1 completed order after reprocessing, got %d", m.complete.Len())
	}

}
