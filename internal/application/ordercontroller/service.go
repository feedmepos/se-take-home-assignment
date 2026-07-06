// Package ordercontroller 实现订单控制器的应用服务，编排领域规则、定时器与事件日志。
package ordercontroller

import (
	"errors"
	"sync"
	"time"

	"github.com/lijian-bj/se-take-home-assignment/internal/application/port"
	domain "github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"
)

// Service 是订单控制器的应用服务，负责用例编排与并发安全。
type Service struct {
	mu      sync.Mutex              // 保护聚合根与定时器 map 的并发访问
	agg     *domain.OrderController // 领域聚合根
	clock   port.Clock              // 可注入时钟
	log     port.EventLog           // 事件日志
	process time.Duration           // 每单处理时长（默认 10s，CI 可缩短）
	timers  map[int]port.TimerHandle // Bot ID → 当前处理定时器
	started bool                    // 是否已输出 SYSTEM started
}

// NewService 创建应用服务实例。
func NewService(clock port.Clock, log port.EventLog, processDuration time.Duration) *Service {
	return &Service{
		agg:     domain.NewOrderController(),
		clock:   clock,
		log:     log,
		process: processDuration,
		timers:  make(map[int]port.TimerHandle),
	}
}

// Start 输出系统启动日志，幂等调用。
func (s *Service) Start() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.started {
		s.log.SystemStarted()
		s.started = true
	}
}

// CreateNormalOrder 创建普通订单，并尝试唤醒一个空闲 Bot 取单。
func (s *Service) CreateNormalOrder() (domain.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	order := s.agg.PlaceNormalOrder()
	s.log.OrderCreated(order, s.agg.Pending())
	s.wakeOneIdleBot()
	return order, nil
}

// CreateVIPOrder 创建 VIP 订单，并尝试唤醒一个空闲 Bot 取单。
func (s *Service) CreateVIPOrder() (domain.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	order := s.agg.PlaceVIPOrder()
	s.log.OrderCreated(order, s.agg.Pending())
	s.wakeOneIdleBot()
	return order, nil
}

// AddBot 新增 Bot，并立即尝试从队首取单。
func (s *Service) AddBot() (domain.Bot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	bot := s.agg.AddBot()
	s.log.BotCreated(bot.ID)
	s.assignOrder(bot.ID)
	return bot, nil
}

// RemoveBot 按 LIFO 移除最新 Bot；若正在处理则取消定时器并回插订单。
func (s *Service) RemoveBot() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	removal, err := s.agg.RemoveLatestBot()
	if err != nil {
		s.log.Warn("no bot to remove")
		return err
	}

	if timer, ok := s.timers[removal.BotID]; ok {
		timer.Stop()
		delete(s.timers, removal.BotID)
	}

	if removal.Interrupted != nil {
		s.log.BotInterrupted(removal.BotID, *removal.Interrupted, removal.PickupIndex, s.agg.Pending())
	}

	s.log.BotRemoved(removal.BotID)
	return nil
}

// LogStatus 输出当前系统状态快照到事件日志。
func (s *Service) LogStatus() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.log.StatusSnapshot(s.agg.Snapshot())
}

// Status 返回当前系统状态快照（供测试或查询使用）。
func (s *Service) Status() domain.Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.agg.Snapshot()
}

// Shutdown 停止所有进行中的处理定时器，应在进程退出前调用。
func (s *Service) Shutdown() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, timer := range s.timers {
		timer.Stop()
		delete(s.timers, id)
	}
}

// WaitUntilIdle 阻塞直到系统完全空闲（无待处理订单且无 Bot 在处理），或超时返回错误。
// 若时钟支持 Advance（Mock 时钟），则快进时间以加速测试等待。
func (s *Service) WaitUntilIdle(timeout time.Duration) error {
	deadline := s.clock.Now().Add(timeout)
	for {
		s.mu.Lock()
		idle := s.agg.IsFullyIdle()
		s.mu.Unlock()
		if idle {
			return nil
		}
		if s.clock.Now().After(deadline) {
			return errors.New("timeout waiting for idle")
		}
		if advancer, ok := s.clock.(interface{ Advance(time.Duration) }); ok {
			advancer.Advance(10 * time.Millisecond)
		} else {
			time.Sleep(10 * time.Millisecond)
		}
	}
}

// wakeOneIdleBot 唤醒 ID 最小的空闲 Bot 取单（每次仅唤醒一个）。
func (s *Service) wakeOneIdleBot() {
	if botID, ok := s.agg.LowestIdleBotID(); ok {
		s.assignOrder(botID)
	}
}

// assignOrder 让指定 Bot 取单并启动处理定时器。
func (s *Service) assignOrder(botID int) {
	assign, ok := s.agg.TryAssignOrder(botID)
	if !ok {
		return
	}

	s.log.BotPicked(assign.BotID, assign.Order, assign.PickupIndex)
	botIDCopy := assign.BotID
	s.timers[botID] = s.clock.AfterFunc(s.process, func() {
		s.onProcessingComplete(botIDCopy)
	})
}

// onProcessingComplete 是处理定时器的回调：完成当前订单，并视情况继续取下一单或转 IDLE。
func (s *Service) onProcessingComplete(botID int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.timers, botID)

	completion, ok := s.agg.CompleteOrder(botID)
	if !ok {
		return
	}

	s.log.BotCompleted(completion.BotID, completion.Order, s.agg.CompleteIDs())

	if completion.HasNext && completion.NextAssign != nil {
		next := *completion.NextAssign
		s.log.BotPicked(next.BotID, next.Order, next.PickupIndex)
		botIDCopy := next.BotID
		s.timers[botID] = s.clock.AfterFunc(s.process, func() {
			s.onProcessingComplete(botIDCopy)
		})
		return
	}

	s.log.BotIdle(completion.BotID)
}
