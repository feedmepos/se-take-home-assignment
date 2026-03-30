package controller

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewOrder_SequentialIDs(t *testing.T) {
	clk := NewMockClock()
	var events []Event
	var mu sync.Mutex
	ctrl := NewController(func(e Event) {
		mu.Lock()
		events = append(events, e)
		mu.Unlock()
	}, clk)

	o1 := ctrl.NewOrder(OrderNormal)
	o2 := ctrl.NewOrder(OrderVIP)
	o3 := ctrl.NewOrder(OrderNormal)

	assert.Equal(t, 1000, o1.ID)
	assert.Equal(t, 1001, o2.ID)
	assert.Equal(t, 1002, o3.ID)
	assert.Equal(t, OrderNormal, o1.Type)
	assert.Equal(t, OrderVIP, o2.Type)
}

func TestVIPProcessedFirst(t *testing.T) {
	clk := NewMockClock()
	var events []Event
	var mu sync.Mutex
	ctrl := NewController(func(e Event) {
		mu.Lock()
		events = append(events, e)
		mu.Unlock()
	}, clk)

	ctrl.NewOrder(OrderNormal) // #1000
	ctrl.NewOrder(OrderVIP)    // #1001
	ctrl.NewOrder(OrderNormal) // #1002

	botID := ctrl.AddBot()
	assert.Equal(t, 1, botID)

	// 推进 10 秒完成
	clk.Add(10 * time.Second)
	time.Sleep(100 * time.Millisecond) // 等待 goroutine 处理

	mu.Lock()
	defer mu.Unlock()

	// VIP #1001 应该先被处理
	var processingOrder *Order
	for _, e := range events {
		if e.Type == "order_processing" {
			d := e.Data.(map[string]interface{})
			processingOrder = &Order{ID: d["order_id"].(int)}
			break
		}
	}
	require.NotNil(t, processingOrder)
	assert.Equal(t, 1001, processingOrder.ID, "VIP 订单应先被处理")
}

func TestBotDestroysHighest(t *testing.T) {
	clk := NewMockClock()
	ctrl := NewController(noopHandler, clk)

	bot1 := ctrl.AddBot()
	bot2 := ctrl.AddBot()
	bot3 := ctrl.AddBot()

	assert.Equal(t, 1, bot1)
	assert.Equal(t, 2, bot2)
	assert.Equal(t, 3, bot3)

	err := ctrl.RemoveBot()
	require.NoError(t, err)

	bots := ctrl.GetBots()
	assert.Equal(t, 2, len(bots))

	botIDs := make(map[int]bool)
	for _, b := range bots {
		botIDs[b.ID] = true
	}
	assert.True(t, botIDs[1])
	assert.True(t, botIDs[2])
	assert.False(t, botIDs[3])
}

func TestOrderReturnOnBotDestroy(t *testing.T) {
	clk := NewMockClock()
	var events []Event
	var mu sync.Mutex
	ctrl := NewController(func(e Event) {
		mu.Lock()
		events = append(events, e)
		mu.Unlock()
	}, clk)

	ctrl.NewOrder(OrderNormal) // #1000
	ctrl.NewOrder(OrderVIP)    // #1001

	ctrl.AddBot() // Bot #1 → VIP #1001

	// 销毁 Bot，订单应回退
	err := ctrl.RemoveBot()
	require.NoError(t, err)

	// 验证订单回退事件
	mu.Lock()
	defer mu.Unlock()

	found := false
	for _, e := range events {
		if e.Type == "order_returned" {
			d := e.Data.(map[string]interface{})
			assert.Equal(t, 1001, d["order_id"])
			assert.Equal(t, "VIP", d["type"], "回退订单应保留原始类型")
			found = true
		}
	}
	assert.True(t, found, "应触发订单回退事件")

	// 验证回退订单的 ProcessingAt 被清除
	orders := ctrl.GetOrders()
	for _, o := range orders {
		if o.ID == 1001 {
			assert.Nil(t, o.ProcessingAt, "回退订单的 ProcessingAt 应为 nil")
			assert.Equal(t, StatusPending, o.Status, "回退订单状态应为 PENDING")
		}
	}
}

func TestBotBecomesIdle(t *testing.T) {
	clk := NewMockClock()
	var events []Event
	var mu sync.Mutex
	ctrl := NewController(func(e Event) {
		mu.Lock()
		events = append(events, e)
		mu.Unlock()
	}, clk)

	ctrl.NewOrder(OrderNormal) // #1000
	ctrl.AddBot()              // Bot #1 取走 #1000

	// 推进 10 秒完成订单
	clk.Add(10 * time.Second)

	// 等待 goroutine 处理完成
	assert.Eventually(t, func() bool {
		return ctrl.GetStatus().Complete == 1
	}, 2*time.Second, 50*time.Millisecond, "订单应已完成")

	status := ctrl.GetStatus()
	assert.Equal(t, 1, status.IdleBots, "Bot 应空闲")
}

func TestRemoveBotNoBots(t *testing.T) {
	clk := NewMockClock()
	ctrl := NewController(noopHandler, clk)

	err := ctrl.RemoveBot()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no bots")
}

func TestGetStatus(t *testing.T) {
	clk := NewMockClock()
	ctrl := NewController(noopHandler, clk)

	ctrl.NewOrder(OrderNormal)
	ctrl.NewOrder(OrderVIP)
	ctrl.AddBot()

	status := ctrl.GetStatus()
	assert.Equal(t, 2, status.TotalOrders)
	assert.Equal(t, 1, status.ActiveBots)  // 1个处理中
}

func TestOrderProcessingAt(t *testing.T) {
	clk := NewMockClock()
	var events []Event
	var mu sync.Mutex
	ctrl := NewController(func(e Event) {
		mu.Lock()
		events = append(events, e)
		mu.Unlock()
	}, clk)

	ctrl.NewOrder(OrderNormal) // #1000
	ctrl.AddBot()              // Bot #1 取走 #1000

	mu.Lock()
	defer mu.Unlock()

	// 验证 order_processing 事件包含 processing_at
	for _, e := range events {
		if e.Type == "order_processing" {
			d := e.Data.(map[string]interface{})
			assert.Equal(t, 1000, d["order_id"])
			assert.NotNil(t, d["processing_at"], "processing_at 不应为 nil")
			assert.Equal(t, clk.Now().Format("15:04:05"), d["processing_at"])
			return
		}
	}
	t.Fatal("未找到 order_processing 事件")
}

func TestOrderCompletedAt(t *testing.T) {
	clk := NewMockClock()
	var events []Event
	var mu sync.Mutex
	ctrl := NewController(func(e Event) {
		mu.Lock()
		events = append(events, e)
		mu.Unlock()
	}, clk)

	ctrl.NewOrder(OrderNormal) // #1000
	ctrl.AddBot()              // Bot #1 取走 #1000

	// 推进 10 秒完成订单
	clk.Add(10 * time.Second)

	assert.Eventually(t, func() bool {
		mu.Lock()
		defer mu.Unlock()
		for _, e := range events {
			if e.Type == "order_complete" {
				return true
			}
		}
		return false
	}, 2*time.Second, 50*time.Millisecond, "应触发 order_complete 事件")

	mu.Lock()
	defer mu.Unlock()

	for _, e := range events {
		if e.Type == "order_complete" {
			d := e.Data.(map[string]interface{})
			assert.Equal(t, 1000, d["order_id"])
			assert.NotNil(t, d["completed_at"], "completed_at 不应为 nil")
			assert.Equal(t, clk.Now().Format("15:04:05"), d["completed_at"])
			return
		}
	}
	t.Fatal("未找到 order_complete 事件")
}

func TestReset(t *testing.T) {
	clk := NewMockClock()
	var events []Event
	var mu sync.Mutex
	ctrl := NewController(func(e Event) {
		mu.Lock()
		events = append(events, e)
		mu.Unlock()
	}, clk)

	// 创建订单和 Bot
	ctrl.NewOrder(OrderNormal) // #1000
	ctrl.NewOrder(OrderVIP)    // #1001
	ctrl.AddBot()              // Bot #1

	// 推进完成
	clk.Add(10 * time.Second)
	assert.Eventually(t, func() bool {
		return ctrl.GetStatus().Complete == 1
	}, 2*time.Second, 50*time.Millisecond)

	// 重置
	ctrl.Reset()

	// 验证状态清空
	status := ctrl.GetStatus()
	assert.Equal(t, 0, status.TotalOrders, "重置后订单应为空")
	assert.Equal(t, 0, status.ActiveBots, "重置后 Bot 应为空")
	assert.Equal(t, 0, status.Pending)
	assert.Equal(t, 0, status.Processing)
	assert.Equal(t, 0, status.Complete)

	// 验证 system_reset 事件
	mu.Lock()
	found := false
	for _, e := range events {
		if e.Type == "system_reset" {
			found = true
		}
	}
	mu.Unlock()
	assert.True(t, found, "应触发 system_reset 事件")

	// 验证重置后 ID 从头开始
	o1 := ctrl.NewOrder(OrderNormal)
	assert.Equal(t, 1000, o1.ID, "重置后订单 ID 应从 1000 开始")

	b1 := ctrl.AddBot()
	assert.Equal(t, 1, b1, "重置后 Bot ID 应从 1 开始")
}
