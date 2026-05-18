package bot

import (
	"fmt"
	"sync"
	"time"
	"feedme-order-controller/internal/order"
)

// Bot 机器人结构体
type Bot struct {
	ID          int            // 机器人ID
	CurrentOrder *order.Order  // 当前处理的订单
	isActive    bool           // 是否活跃
	stopChan    chan struct{}  // 停止信号通道
	doneChan    chan struct{}  // 完成信号通道
}

// BotManager 机器人管理器
type BotManager struct {
	mu        sync.Mutex
	bots      []*Bot
	nextID    int
	orderMgr  *order.OrderManager
	results   []string // 存储结果输出
	resultMu  sync.Mutex // 专门用于保护results的锁
}

// NewBotManager 创建新的机器人管理器
func NewBotManager(orderMgr *order.OrderManager) *BotManager {
	return &BotManager{
		bots:     make([]*Bot, 0),
		nextID:   1,
		orderMgr: orderMgr,
		results:  make([]string, 0),
	}
}

// AddBot 添加新机器人
func (bm *BotManager) AddBot() *Bot {
	bm.mu.Lock()

	bot := &Bot{
		ID:       bm.nextID,
		isActive: true,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}
	bm.nextID++
	bm.bots = append(bm.bots, bot)

	bm.mu.Unlock()

	// 立即开始处理订单
	go bot.processOrders(bm.orderMgr, bm)

	bm.addResult(fmt.Sprintf("%s Added bot #%d", time.Now().Format("15:04:05"), bot.ID))
	
	return bot
}

// RemoveBot 移除最新的机器人
func (bm *BotManager) RemoveBot() bool {
	bm.mu.Lock()

	if len(bm.bots) == 0 {
		bm.mu.Unlock()
		return false
	}

	// 获取最后一个机器人
	lastBotIndex := len(bm.bots) - 1
	lastBot := bm.bots[lastBotIndex]

	// 如果机器人正在处理订单，将订单返回队列
	var orderID int
	if lastBot.CurrentOrder != nil {
		orderID = lastBot.CurrentOrder.ID
		bm.orderMgr.ReturnOrderToQueue(lastBot.CurrentOrder)
	}

	// 停止机器人
	close(lastBot.stopChan)
	
	// 从列表中移除
	bm.bots = bm.bots[:lastBotIndex]
	
	botID := lastBot.ID
	bm.mu.Unlock()
	
	// 在锁外添加结果记录
	if orderID > 0 {
		bm.addResult(fmt.Sprintf("%s Bot #%d stopped processing order #%d, order returned to queue", 
			time.Now().Format("15:04:05"), botID, orderID))
	}
	bm.addResult(fmt.Sprintf("%s Removed bot #%d", time.Now().Format("15:04:05"), botID))
	
	return true
}

// GetBotCount 获取机器人数量
func (bm *BotManager) GetBotCount() int {
	bm.mu.Lock()
	defer bm.mu.Unlock()
	
	return len(bm.bots)
}

// addResult 添加结果记录
func (bm *BotManager) addResult(result string) {
	bm.resultMu.Lock()
	defer bm.resultMu.Unlock()
	
	bm.results = append(bm.results, result)
}

// GetResults 获取所有结果
func (bm *BotManager) GetResults() []string {
	bm.resultMu.Lock()
	defer bm.resultMu.Unlock()
	
	resultsCopy := make([]string, len(bm.results))
	copy(resultsCopy, bm.results)
	
	return resultsCopy
}

// processOrders 处理订单的 goroutine
func (b *Bot) processOrders(orderMgr *order.OrderManager, botMgr *BotManager) {
	defer close(b.doneChan)
	
	for {
		select {
		case <-b.stopChan:
			// 收到停止信号
			return
		default:
			// 尝试获取下一个待处理订单
			order := orderMgr.GetNextPendingOrder()
			if order == nil {
				// 没有待处理订单，等待一段时间再检查
				time.Sleep(100 * time.Millisecond)
				continue
			}
			
			// 设置当前处理的订单
			b.CurrentOrder = order
			
			botMgr.addResult(fmt.Sprintf("%s Bot #%d started processing order #%d", 
				time.Now().Format("15:04:05"), b.ID, order.ID))
			
			// 模拟处理时间（10秒）
			select {
			case <-time.After(10 * time.Second):
				// 处理完成
				orderMgr.CompleteOrder(order.ID)
				botMgr.addResult(fmt.Sprintf("%s Bot #%d completed order #%d", 
					time.Now().Format("15:04:05"), b.ID, order.ID))
				b.CurrentOrder = nil
			case <-b.stopChan:
				// 在处理过程中被停止
				botMgr.addResult(fmt.Sprintf("%s Bot #%d was stopped while processing order #%d", 
					time.Now().Format("15:04:05"), b.ID, order.ID))
				return
			}
		}
	}
}

// String 返回机器人状态的字符串表示
func (b *Bot) String() string {
	status := "IDLE"
	if b.CurrentOrder != nil {
		status = fmt.Sprintf("PROCESSING Order #%d", b.CurrentOrder.ID)
	}
	return fmt.Sprintf("Bot #%d [%s]", b.ID, status)
}
