package service

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/feedme/se-take-home-assignment/internal/clock"
	"github.com/feedme/se-take-home-assignment/internal/domain"
	"github.com/feedme/se-take-home-assignment/internal/repository/memory"
)

// KitchenOption 可选配置（测试缩短烹饪时间）。
type KitchenOption func(*Kitchen)

// WithCookDuration 覆盖默认 10s 烹饪时长。
func WithCookDuration(d time.Duration) KitchenOption {
	return func(k *Kitchen) {
		if d > 0 {
			k.cookDuration = d
		}
	}
}

// Kitchen 应用服务：订单 + Bot 池（DESIGN 3 / P3–P5）。
type Kitchen struct {
	mem          *memory.Memory
	clk          clock.Clock
	cookDuration time.Duration

	mu   sync.Mutex
	bots []*botHandle
	seq  domain.BotIDSeq
}

type botHandle struct {
	id     domain.BotID
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewKitchen 构造厨房；clk 为 nil 时使用 RealClock。
func NewKitchen(mem *memory.Memory, clk clock.Clock, opts ...KitchenOption) *Kitchen {
	if clk == nil {
		clk = clock.RealClock{}
	}
	k := &Kitchen{
		mem:          mem,
		clk:          clk,
		cookDuration: 10 * time.Second,
	}
	for _, o := range opts {
		o(k)
	}
	return k
}

// CreateOrder 新建 pending 订单并入队。
func (k *Kitchen) CreateOrder(ctx context.Context, tier domain.Tier) (*domain.Order, error) {
	_ = ctx
	return k.mem.CreatePendingOrder(tier)
}

// AddBot 增加一台烹饪机器人并启动工作循环。
func (k *Kitchen) AddBot(ctx context.Context) (*BotDTO, error) {
	_ = ctx
	k.mu.Lock()
	id := k.seq.Next()
	botCtx, cancel := context.WithCancel(context.Background())
	h := &botHandle{id: id, cancel: cancel}
	k.bots = append(k.bots, h)
	h.wg.Add(1)
	k.mu.Unlock()
	go func() {
		defer h.wg.Done()
		k.runBot(botCtx, id)
	}()
	return &BotDTO{ID: uint64(id), State: "idle"}, nil
}

// RemoveBot 按 LIFO 销毁最新一台 Bot；若正在烹饪则取消并回队（README 6）。
func (k *Kitchen) RemoveBot(ctx context.Context) error {
	_ = ctx
	k.mu.Lock()
	if len(k.bots) == 0 {
		k.mu.Unlock()
		return ErrNoBot
	}
	last := k.bots[len(k.bots)-1]
	k.bots = k.bots[:len(k.bots)-1]
	k.mu.Unlock()
	last.cancel()
	last.wg.Wait()
	return nil
}

func (k *Kitchen) runBot(ctx context.Context, id domain.BotID) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		order, err := k.mem.AcquireNext(ctx, id)
		if err != nil {
			return
		}
		cookCtx, cancelCook := context.WithCancel(ctx)
		doneCook := make(chan struct{})
		var wgSync sync.WaitGroup
		wgSync.Add(1)
		go func() {
			defer wgSync.Done()
			select {
			case <-ctx.Done():
				cancelCook()
			case <-doneCook:
			}
		}()
		errSleep := k.clk.Sleep(cookCtx, k.cookDuration)
		close(doneCook)
		wgSync.Wait()
		cancelCook()

		if errors.Is(errSleep, context.Canceled) {
			_ = k.mem.CancelAndRequeue(order.ID, id)
			continue
		}
		if errSleep != nil {
			_ = k.mem.FailToException(order.ID, id, domain.ExceptionInternal, "COOK_ERR", errSleep.Error())
			continue
		}
		if err := k.mem.CompleteOrder(order.ID, id); err != nil {
			// 与 -Bot 竞态：可能已被取消
			continue
		}
	}
}

// RetryOrder 将 exception 订单按规则回到队尾（DESIGN 5.2）。
func (k *Kitchen) RetryOrder(ctx context.Context, id domain.OrderID) error {
	_ = ctx
	return k.mem.RetryExceptionToPending(id)
}

// FailProcessingOrder 将 processing 订单打入 exception（测试 / 管理用）。
func (k *Kitchen) FailProcessingOrder(ctx context.Context, id domain.OrderID) error {
	_ = ctx
	o, err := k.mem.GetOrder(id)
	if err != nil {
		return err
	}
	if o.Status != domain.OrderProcessing || o.BotID == nil {
		return errors.New("service: order not processing")
	}
	return k.mem.FailToException(id, *o.BotID, domain.ExceptionInternal, "INJECTED", "fail")
}
