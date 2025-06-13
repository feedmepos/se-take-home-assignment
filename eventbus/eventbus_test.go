package eventbus

import (
	"context"
	"testing"
	"time"
)

func TestInitEventBus(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	
	// 验证通道已创建
	if orderCreatedChan == nil {
		t.Error("期望orderCreatedChan被初始化，实际为nil")
	}
	
	if botAddedChan == nil {
		t.Error("期望botAddedChan被初始化，实际为nil")
	}
}

func TestPublishOrderCreated(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	ctx := context.Background()
	
	// 发布订单创建事件
	orderID := int64(123)
	go PublishOrderCreated(ctx, orderID)
	
	// 从通道接收事件
	select {
	case receivedID := <-GetOrderCreatedChan(ctx):
		if receivedID != orderID {
			t.Errorf("期望接收到订单ID %d，实际接收到 %d", orderID, receivedID)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("接收订单创建事件超时")
	}
}

func TestPublishBotAdded(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	ctx := context.Background()
	
	// 发布机器人添加事件
	botID := int64(456)
	go PublishBotAdded(ctx, botID)
	
	// 从通道接收事件
	select {
	case receivedID := <-GetBotAddedChan(ctx):
		if receivedID != botID {
			t.Errorf("期望接收到机器人ID %d，实际接收到 %d", botID, receivedID)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("接收机器人添加事件超时")
	}
}

func TestGetOrderCreatedChan(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	ctx := context.Background()
	
	// 获取订单创建通道
	ch := GetOrderCreatedChan(ctx)
	
	// 验证通道不为nil
	if ch == nil {
		t.Error("期望获取到非nil的订单创建通道，实际为nil")
	}
	
	// 验证通道是否是orderCreatedChan
	if ch != orderCreatedChan {
		t.Error("期望获取到orderCreatedChan，实际获取到不同的通道")
	}
}

func TestGetBotAddedChan(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	ctx := context.Background()
	
	// 获取机器人添加通道
	ch := GetBotAddedChan(ctx)
	
	// 验证通道不为nil
	if ch == nil {
		t.Error("期望获取到非nil的机器人添加通道，实际为nil")
	}
	
	// 验证通道是否是botAddedChan
	if ch != botAddedChan {
		t.Error("期望获取到botAddedChan，实际获取到不同的通道")
	}
}

func TestChannelCapacity(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	
	// 验证订单创建通道容量
	if cap(orderCreatedChan) != 1024 {
		t.Errorf("期望订单创建通道容量为1024，实际为 %d", cap(orderCreatedChan))
	}
	
	// 验证机器人添加通道容量
	if cap(botAddedChan) != 64 {
		t.Errorf("期望机器人添加通道容量为64，实际为 %d", cap(botAddedChan))
	}
}

func TestMultiplePublishOrderCreated(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	ctx := context.Background()
	
	// 发布多个订单创建事件
	orderIDs := []int64{1, 2, 3, 4, 5}
	receivedIDs := make([]int64, 0, len(orderIDs))
	
	// 启动接收协程
	done := make(chan bool)
	go func() {
		for i := 0; i < len(orderIDs); i++ {
			select {
			case id := <-GetOrderCreatedChan(ctx):
				receivedIDs = append(receivedIDs, id)
			case <-time.After(100 * time.Millisecond):
				t.Error("接收订单创建事件超时")
			}
		}
		done <- true
	}()
	
	// 发布事件
	for _, id := range orderIDs {
		PublishOrderCreated(ctx, id)
	}
	
	// 等待接收完成
	<-done
	
	// 验证接收到的ID数量
	if len(receivedIDs) != len(orderIDs) {
		t.Errorf("期望接收到 %d 个订单ID，实际接收到 %d 个", len(orderIDs), len(receivedIDs))
	}
	
	// 验证接收到的ID是否正确（顺序可能不同）
	for _, id := range orderIDs {
		found := false
		for _, receivedID := range receivedIDs {
			if id == receivedID {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("未接收到订单ID %d", id)
		}
	}
}

func TestMultiplePublishBotAdded(t *testing.T) {
	// 初始化事件总线
	InitEventBus()
	ctx := context.Background()
	
	// 发布多个机器人添加事件
	botIDs := []int64{101, 102, 103}
	receivedIDs := make([]int64, 0, len(botIDs))
	
	// 启动接收协程
	done := make(chan bool)
	go func() {
		for i := 0; i < len(botIDs); i++ {
			select {
			case id := <-GetBotAddedChan(ctx):
				receivedIDs = append(receivedIDs, id)
			case <-time.After(100 * time.Millisecond):
				t.Error("接收机器人添加事件超时")
			}
		}
		done <- true
	}()
	
	// 发布事件
	for _, id := range botIDs {
		PublishBotAdded(ctx, id)
	}
	
	// 等待接收完成
	<-done
	
	// 验证接收到的ID数量
	if len(receivedIDs) != len(botIDs) {
		t.Errorf("期望接收到 %d 个机器人ID，实际接收到 %d 个", len(botIDs), len(receivedIDs))
	}
	
	// 验证接收到的ID是否正确（顺序可能不同）
	for _, id := range botIDs {
		found := false
		for _, receivedID := range receivedIDs {
			if id == receivedID {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("未接收到机器人ID %d", id)
		}
	}
}
