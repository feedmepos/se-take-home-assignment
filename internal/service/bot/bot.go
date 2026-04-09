package bot

import (
	"fmt"
	"sync"
	"time"

	"github.com/feedme/order-controller/internal/dao/bot"
	order2 "github.com/feedme/order-controller/internal/dao/order"
	"github.com/feedme/order-controller/internal/service/order"
	"github.com/feedme/order-controller/pkg/unique"
	"github.com/feedme/order-controller/pkg/util"
)

type Bot struct {
	bot          *bot.Bot
	currentOrder *order2.Order
	stopChan     chan struct{}
}

type Manager struct {
	mu           sync.RWMutex
	bots         map[int64]*Bot
	orderManager *order.Manager
	outputChan   chan string
}

func NewManager(orderMgr *order.Manager, outputChan chan string) *Manager {
	return &Manager{
		bots:         make(map[int64]*Bot),
		orderManager: orderMgr,
		outputChan:   outputChan,
	}
}

func (m *Manager) AddBot() *Bot {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := unique.NextID()

	b := &Bot{
		bot: &bot.Bot{
			Id:          id,
			Status:      bot.Active,
			ProcessTime: 10 * time.Second,
		},
		stopChan: make(chan struct{}),
	}

	m.bots[b.bot.Id] = b

	m.outputChan <- fmt.Sprintf("[%s] Bot #%d created - Status: %s", util.FormatTimestamp(), b.bot.Id, b.bot.Status)

	go m.processOrders(b)

	return b
}

func (m *Manager) RemoveNewestBot() bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.bots) == 0 {
		return false
	}

	var newestBot *Bot
	for _, b := range m.bots {
		if newestBot == nil || b.bot.Id > newestBot.bot.Id {
			newestBot = b
		}
	}

	if newestBot == nil {
		return false
	}

	close(newestBot.stopChan)

	if newestBot.currentOrder != nil {
		m.orderManager.ReturnOrderToPending(newestBot.currentOrder)
		m.outputChan <- fmt.Sprintf("[%s] Bot #%d destroyed - Order #%d returned to PENDING", util.FormatTimestamp(), newestBot.bot.Id, newestBot.currentOrder.Id)
	} else {
		m.outputChan <- fmt.Sprintf("[%s] Bot #%d destroyed while IDLE", util.FormatTimestamp(), newestBot.bot.Id)
	}

	delete(m.bots, newestBot.bot.Id)
	return true
}

func (m *Manager) processOrders(b *Bot) {
	idleReported := false
	for {
		select {
		case <-b.stopChan:
			return
		default:
			b.bot.Status = bot.Active
			b.currentOrder = m.orderManager.GetNextPendingOrder()

			if b.currentOrder == nil {
				b.bot.Status = bot.Idle
				if !idleReported {
					m.outputChan <- fmt.Sprintf("[%s] Bot #%d is now IDLE - No pending orders", util.FormatTimestamp(), b.bot.Id)
					idleReported = true
				}

				select {
				case <-b.stopChan:
					return
				case <-time.After(100 * time.Millisecond):
					continue
				}
			}

			idleReported = false
			m.outputChan <- fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING", util.FormatTimestamp(), b.bot.Id, b.currentOrder.Type, b.currentOrder.Id)

			select {
			case <-b.stopChan:
				return
			case <-time.After(b.bot.ProcessTime):
				orderID := b.currentOrder.Id
				orderType := b.currentOrder.Type
				m.orderManager.CompleteOrder(orderID)
				m.outputChan <- fmt.Sprintf("[%s] Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: 10s)", util.FormatTimestamp(), b.bot.Id, orderType, orderID)
				b.currentOrder = nil
			}
		}
	}
}

func (m *Manager) GetBotCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.bots)
}

func (m *Manager) GetActiveBotCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	count := 0
	for _, b := range m.bots {
		if b.bot.Status == bot.Active {
			count++
		}
	}
	return count
}
