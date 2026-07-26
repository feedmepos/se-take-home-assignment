package application

import (
	"container/list"
	"context"
	"testing"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/domain"
)

type updateStatusCall struct {
	order  *domain.Order
	status domain.OrderStatus
}

type mockOrderRepo struct {
	createCalled bool
	createArg    domain.OrderType
	createReturn *domain.Order

	updateStatusCalls []updateStatusCall
}

func (m *mockOrderRepo) Create(t domain.OrderType) *domain.Order {
	m.createCalled = true
	m.createArg = t

	return m.createReturn
}

func (m *mockOrderRepo) UpdateStatus(order *domain.Order, status domain.OrderStatus) {
	m.updateStatusCalls = append(m.updateStatusCalls, updateStatusCall{order: order, status: status})
}

func (m *mockOrderRepo) GetCompletedOrders(domain.OrderType) []*domain.Order { return nil }

type mockQueueRepo struct {
	queueCalled bool
	queueArg    *domain.Order

	shiftCalled bool
	shiftReturn *domain.Order

	unShiftCalled bool
	unShiftArg    *domain.Order
}

func (m *mockQueueRepo) Queue(order *domain.Order) {
	m.queueCalled = true
	m.queueArg = order
}

func (m *mockQueueRepo) Shift() *domain.Order {
	m.shiftCalled = true

	return m.shiftReturn
}

func (m *mockQueueRepo) UnShift(order *domain.Order) {
	m.unShiftCalled = true
	m.unShiftArg = order
}

func (m *mockQueueRepo) GetPending() *list.List { return list.New() }

// given orderType to create new order
// when create
// then orderRepo.Create(orderType) should be called
// and QueueRepo.Queue should be called
// and EventBus.OrderCreated should be called
// and return new createdOrder
func TestOrderApp_Create(t *testing.T) {
	orderType := domain.OrderTypeVIP
	expectedOrder := domain.NewOrder(1, orderType)

	orderRepo := &mockOrderRepo{createReturn: expectedOrder}
	queueRepo := &mockQueueRepo{}
	eventBus := &mockEventBus{}

	app := NewOrderApp(time.Second, OrderDeps{
		OrderRepo: orderRepo,
		Queue:     queueRepo,
		Event:     eventBus,
	})

	createdOrder, err := app.Create(orderType)

	if !orderRepo.createCalled {
		t.Error("expected orderRepo.Create to be called")
	}
	if orderRepo.createArg != orderType {
		t.Errorf("expected orderRepo.Create to be called with %q, got %q", orderType, orderRepo.createArg)
	}

	if !queueRepo.queueCalled {
		t.Error("expected queueRepo.Queue to be called")
	}
	if queueRepo.queueArg != expectedOrder {
		t.Errorf("expected queueRepo.Queue to be called with %v, got %v", expectedOrder, queueRepo.queueArg)
	}

	if !eventBus.orderCreatedCalled {
		t.Error("expected eventBus.OrderCreated to be called")
	}
	if eventBus.orderCreatedArg != *expectedOrder {
		t.Errorf("expected eventBus.OrderCreated to be called with %v, got %v", *expectedOrder, eventBus.orderCreatedArg)
	}

	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if createdOrder != expectedOrder {
		t.Errorf("expected returned order to be %v, got %v", expectedOrder, createdOrder)
	}
}

// given a queue with a pending order
// when Pick is called
// then queueRepo.Shift should be called
// and return the order from the queue
func TestOrderApp_Pick(t *testing.T) {
	expectedOrder := domain.NewOrder(1, domain.OrderTypeNormal)

	orderRepo := &mockOrderRepo{}
	queueRepo := &mockQueueRepo{shiftReturn: expectedOrder}
	eventBus := &mockEventBus{}

	app := NewOrderApp(time.Second, OrderDeps{
		OrderRepo: orderRepo,
		Queue:     queueRepo,
		Event:     eventBus,
	})

	pickedOrder := app.Pick()

	if !queueRepo.shiftCalled {
		t.Error("expected queueRepo.Shift to be called")
	}

	if pickedOrder != expectedOrder {
		t.Errorf("expected returned order to be %v, got %v", expectedOrder, pickedOrder)
	}
}

// given an order to re-queue
// when ReQueue is called
// then queueRepo.UnShift(order) should be called
// and eventBus.OrderReQueued should be called
func TestOrderApp_ReQueue(t *testing.T) {
	order := domain.NewOrder(1, domain.OrderTypeNormal)

	orderRepo := &mockOrderRepo{}
	queueRepo := &mockQueueRepo{}
	eventBus := &mockEventBus{}

	app := NewOrderApp(time.Second, OrderDeps{
		OrderRepo: orderRepo,
		Queue:     queueRepo,
		Event:     eventBus,
	})

	app.ReQueue(order)

	if !queueRepo.unShiftCalled {
		t.Error("expected queueRepo.UnShift to be called")
	}
	if queueRepo.unShiftArg != order {
		t.Errorf("expected queueRepo.UnShift to be called with %v, got %v", order, queueRepo.unShiftArg)
	}

	if !eventBus.orderReQueuedCalled {
		t.Error("expected eventBus.OrderReQueued to be called")
	}
	if eventBus.orderReQueuedArg != *order {
		t.Errorf("expected eventBus.OrderReQueued to be called with %v, got %v", *order, eventBus.orderReQueuedArg)
	}
}

// given process duration is 2 sec
// when process order
// then should done without error
// and orderRepo.UpdateStatus should be called with Processing then Complete
// and event.OrderPickedUp and event.OrderCompleted should be called
func TestOrderApp_Process_Done(t *testing.T) {
	processDuration := 2 * time.Second
	order := domain.NewOrder(1, domain.OrderTypeNormal)

	orderRepo := &mockOrderRepo{}
	queueRepo := &mockQueueRepo{}
	eventBus := &mockEventBus{}

	app := NewOrderApp(processDuration, OrderDeps{
		OrderRepo: orderRepo,
		Queue:     queueRepo,
		Event:     eventBus,
	})

	bot := *domain.NewBot(1)

	err := app.Process(context.Background(), bot, order)

	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	if !eventBus.orderPickedUpCalled {
		t.Error("expected eventBus.OrderPickedUp to be called")
	}
	if !eventBus.orderCompletedCalled {
		t.Error("expected eventBus.OrderCompleted to be called")
	}

	if len(orderRepo.updateStatusCalls) != 2 {
		t.Fatalf("expected orderRepo.UpdateStatus to be called twice, got %d", len(orderRepo.updateStatusCalls))
	}
	if orderRepo.updateStatusCalls[0].status != domain.OrderStatusProcessing {
		t.Errorf("expected first status update to be %q, got %q", domain.OrderStatusProcessing, orderRepo.updateStatusCalls[0].status)
	}
	if orderRepo.updateStatusCalls[1].status != domain.OrderStatusComplete {
		t.Errorf("expected second status update to be %q, got %q", domain.OrderStatusComplete, orderRepo.updateStatusCalls[1].status)
	}
}

// given process duration is 2 sec
// when process order BUT cancel before 2 sec
// then should return error context canceled
// and orderRepo.UpdateStatus should be called with Processing only
// and event.OrderPickedUp should be called but event.OrderCompleted should not
func TestOrderApp_Process_CancelledBeforeDone(t *testing.T) {
	processDuration := 2 * time.Second
	order := domain.NewOrder(1, domain.OrderTypeNormal)

	orderRepo := &mockOrderRepo{}
	queueRepo := &mockQueueRepo{}
	eventBus := &mockEventBus{}

	app := NewOrderApp(processDuration, OrderDeps{
		OrderRepo: orderRepo,
		Queue:     queueRepo,
		Event:     eventBus,
	})

	bot := *domain.NewBot(1)

	ctx, cancel := context.WithCancel(context.Background())

	time.AfterFunc(50*time.Millisecond, cancel)
	err := app.Process(ctx, bot, order)

	if err != context.Canceled {
		t.Errorf("expected error %v, got %v", context.Canceled, err)
	}

	if !eventBus.orderPickedUpCalled {
		t.Error("expected eventBus.OrderPickedUp to be called")
	}
	if eventBus.orderCompletedCalled {
		t.Error("expected eventBus.OrderCompleted not to be called")
	}

	if len(orderRepo.updateStatusCalls) != 1 {
		t.Fatalf("expected orderRepo.UpdateStatus to be called once, got %d", len(orderRepo.updateStatusCalls))
	}
	if orderRepo.updateStatusCalls[0].status != domain.OrderStatusProcessing {
		t.Errorf("expected status update to be %q, got %q", domain.OrderStatusProcessing, orderRepo.updateStatusCalls[0].status)
	}
}
