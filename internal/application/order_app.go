package application

import (
	"container/list"
	"context"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/domain"
)

type OrderApp struct {
	orderRepo       domain.OrderRepository
	queue           domain.QueueRepository
	event           domain.EventBus
	processDuration time.Duration
	orderType       domain.OrderType
}

type OrderDeps struct {
	OrderRepo domain.OrderRepository
	Event     domain.EventBus
	Queue     domain.QueueRepository
	Type      domain.OrderType
}

func NewOrderApp(t time.Duration, deps OrderDeps) *OrderApp {
	return &OrderApp{
		orderRepo:       deps.OrderRepo,
		queue:           deps.Queue,
		event:           deps.Event,
		processDuration: t,
		orderType:       deps.Type,
	}
}

func (a *OrderApp) Create(t domain.OrderType) (*domain.Order, error) {
	order := a.orderRepo.Create(t)

	a.queue.Queue(order)
	a.event.OrderCreated(*order)

	return order, nil
}

func (a *OrderApp) Pick() *domain.Order {
	return a.queue.Shift()
}

func (a *OrderApp) Process(ctx context.Context, bot domain.Bot, order *domain.Order) error {
	start := time.Now()

	a.orderRepo.UpdateStatus(order, domain.OrderStatusProcessing)
	a.event.OrderPickedUp(bot, *order)

	if err := a.doSomething(ctx); err != nil {
		return err
	}

	a.orderRepo.UpdateStatus(order, domain.OrderStatusComplete)
	a.event.OrderCompleted(bot, *order, time.Since(start))

	return nil
}

func (a *OrderApp) ReQueue(order *domain.Order) {
	a.queue.UnShift(order)
	a.event.OrderReQueued(*order)
}

func (a *OrderApp) CompletedCount() int {
	return len(a.orderRepo.GetCompletedOrders(a.orderType))
}

func (a *OrderApp) GetPending() *list.List {
	return a.queue.GetPending()
}

func (a *OrderApp) doSomething(ctx context.Context) error {
	done := make(chan struct{})

	go func() {
		time.Sleep(a.processDuration) // simulate process duration
		close(done)
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-done:
		return nil
	}
}
