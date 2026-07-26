package application

import (
	"container/list"
	"context"
	"testing"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/domain"
)

type mockOrderApp struct {
	reQueueCalled bool
	reQueueArg    *domain.Order

	pickCalled bool
	pickReturn *domain.Order

	processDuration time.Duration
	processErr      error

	completedCount int

	// event, when set, is notified the same way the real OrderApp notifies
	// it from within Process, so bot_app tests can observe pick-up/completion.
	event domain.EventBus
}

func (m *mockOrderApp) Create(t domain.OrderType) (*domain.Order, error) { return nil, nil }

func (m *mockOrderApp) Pick() *domain.Order {
	m.pickCalled = true

	return m.pickReturn
}

func (m *mockOrderApp) Process(ctx context.Context, bot domain.Bot, order *domain.Order) error {
	start := time.Now()

	order.Status = domain.OrderStatusProcessing
	if m.event != nil {
		m.event.OrderPickedUp(bot, *order)
	}

	if m.processDuration > 0 {
		time.Sleep(m.processDuration)
	}

	if m.processErr != nil {
		return m.processErr
	}

	order.Status = domain.OrderStatusComplete
	if m.event != nil {
		m.event.OrderCompleted(bot, *order, time.Since(start))
	}

	return nil
}

func (m *mockOrderApp) ReQueue(order *domain.Order) {
	m.reQueueCalled = true
	m.reQueueArg = order
}

func (m *mockOrderApp) CompletedCount() int { return m.completedCount }

func (m *mockOrderApp) GetPending() *list.List { return list.New() }

type mockEventBus struct {
	orderCreatedCalled bool
	orderCreatedArg    domain.Order

	orderReQueuedCalled bool
	orderReQueuedArg    domain.Order

	orderPickedUpCalled bool
	orderPickedUpBot    domain.Bot
	orderPickedUpOrder  domain.Order

	orderCompletedCalled   bool
	orderCompletedBot      domain.Bot
	orderCompletedOrder    domain.Order
	orderCompletedDuration time.Duration

	botCreatedCalled   bool
	botIdleCalled      bool
	botDestroyedCalled bool
}

func (m *mockEventBus) OrderCreated(order domain.Order) {
	m.orderCreatedCalled = true
	m.orderCreatedArg = order
}

func (m *mockEventBus) OrderPickedUp(bot domain.Bot, order domain.Order) {
	m.orderPickedUpCalled = true
	m.orderPickedUpBot = bot
	m.orderPickedUpOrder = order
}

func (m *mockEventBus) OrderReQueued(order domain.Order) {
	m.orderReQueuedCalled = true
	m.orderReQueuedArg = order
}

func (m *mockEventBus) OrderCompleted(bot domain.Bot, order domain.Order, duration time.Duration) {
	m.orderCompletedCalled = true
	m.orderCompletedBot = bot
	m.orderCompletedOrder = order
	m.orderCompletedDuration = duration
}

func (m *mockEventBus) BotCreated(bot domain.Bot) {
	m.botCreatedCalled = true
}

func (m *mockEventBus) BotIdle(bot domain.Bot) {
	m.botIdleCalled = true
}

func (m *mockEventBus) BotDestroyed(bot domain.Bot) {
	m.botDestroyedCalled = true
}

func (m *mockEventBus) Listen() {}
func (m *mockEventBus) Close()  {}

// when AddBot
// should return Bot
// and status is ACTIVE
// and len(ListBot()) should increase by 1
func TestBotApp_AddBot(t *testing.T) {
	app := NewBotApp(nil, nil, &mockEventBus{})

	countBeforeAdd := len(app.ListBot())

	bot := app.AddBot()

	if bot == nil {
		t.Fatal("expected AddBot to return a bot")
	}
	if bot.Status != domain.BotStatusActive {
		t.Errorf("expected bot status to be %q, got %q", domain.BotStatusActive, bot.Status)
	}
	if countBeforeAdd != len(app.ListBot())-1 {
		t.Errorf("expected len(ListBot()) to be %d after AddBot, got %d", countBeforeAdd+1, len(app.ListBot()))
	}
}

// given empty bots
// when removeBot
// then should get error
func TestBotApp_RemoveBot_Empty(t *testing.T) {
	app := NewBotApp(nil, nil, &mockEventBus{})

	err := app.RemoveBot()

	if err == nil {
		t.Error("expected RemoveBot to return an error when there are no bots")
	}
}

// given 3 bots added
// when removeBot
// then len(ListBot()) should be 2
// and the remaining bots should be the 1st and 2nd added bots
func TestBotApp_RemoveBot_RemoveLast(t *testing.T) {
	app := NewBotApp(nil, nil, &mockEventBus{})

	firstBot := app.AddBot()
	secondBot := app.AddBot()
	_ = app.AddBot()

	err := app.RemoveBot()

	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	remaining := app.ListBot()
	if len(remaining) != 2 {
		t.Fatalf("expected 2 bots to remain, got %d", len(remaining))
	}
	if remaining[0].bot != firstBot {
		t.Errorf("expected 1st remaining bot to be the first added bot %p, got %p", firstBot, remaining[0].bot)
	}
	if remaining[1].bot != secondBot {
		t.Errorf("expected 2nd remaining bot to be the second added bot %p, got %p", secondBot, remaining[1].bot)
	}
}

// given 1 bot added
// and bot's order is processing
// when removeBot
// then entry.cancel should be called
// and orderApp.ReQueue should be called
// and without error
func TestBotApp_RemoveBot_Processing(t *testing.T) {
	cancelCalled := false

	orderNormal := &mockOrderApp{}
	app := NewBotApp(nil, orderNormal, &mockEventBus{})

	order := domain.NewOrder(1, domain.OrderTypeNormal)
	order.Status = domain.OrderStatusProcessing

	bot := app.AddBot()
	bot.Order = order

	app.bots[0].cancel = func() { cancelCalled = true }
	err := app.RemoveBot()

	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if !cancelCalled {
		t.Error("expected entry.cancel to be called")
	}
	if !orderNormal.reQueueCalled {
		t.Error("expected orderApp.ReQueue to be called")
	}
	if orderNormal.reQueueArg != order {
		t.Errorf("expected orderApp.ReQueue to be called with %v, got %v", order, orderNormal.reQueueArg)
	}
}

// given orderVIP have 1 order
// and orderNormal have 1 order
// when PickOrder
// then should return orderVIP app and order.Type is VIP
func TestBotApp_PickOrder_VIP(t *testing.T) {
	vipOrder := domain.NewOrder(1, domain.OrderTypeVIP)
	normalOrder := domain.NewOrder(1, domain.OrderTypeNormal)

	orderVIP := &mockOrderApp{pickReturn: vipOrder}
	orderNormal := &mockOrderApp{pickReturn: normalOrder}

	app := NewBotApp(orderVIP, orderNormal, &mockEventBus{})

	gotApp, gotOrder := app.PickOrder()

	if gotApp != domain.OrderApp(orderVIP) {
		t.Errorf("expected returned app to be orderVIP")
	}
	if gotOrder.Type != domain.OrderTypeVIP {
		t.Errorf("expected order.Type to be %q, got %q", domain.OrderTypeVIP, gotOrder.Type)
	}
}

// given orderVIP have 0 order
// and orderNormal have 1 order
// when PickOrder
// then should return orderNormal app and order.Type is Normal
func TestBotApp_PickOrder_Normal(t *testing.T) {
	normalOrder := domain.NewOrder(1, domain.OrderTypeNormal)

	orderVIP := &mockOrderApp{pickReturn: nil}
	orderNormal := &mockOrderApp{pickReturn: normalOrder}

	app := NewBotApp(orderVIP, orderNormal, &mockEventBus{})

	gotApp, gotOrder := app.PickOrder()

	if gotApp != domain.OrderApp(orderNormal) {
		t.Errorf("expected returned app to be orderNormal")
	}
	if gotOrder.Type != domain.OrderTypeNormal {
		t.Errorf("expected order.Type to be %q, got %q", domain.OrderTypeNormal, gotOrder.Type)
	}
}

// given orderVIP have 0 order
// and orderNormal have 0 order
// when PickOrder
// then should return orderNormal app and order is nil
func TestBotApp_PickOrder_None(t *testing.T) {
	orderVIP := &mockOrderApp{pickReturn: nil}
	orderNormal := &mockOrderApp{pickReturn: nil}

	app := NewBotApp(orderVIP, orderNormal, &mockEventBus{})

	gotApp, gotOrder := app.PickOrder()

	if gotApp != domain.OrderApp(orderNormal) {
		t.Errorf("expected returned app to be orderNormal")
	}
	if gotOrder != nil {
		t.Errorf("expected order to be nil, got %v", gotOrder)
	}
}

// given order.Type is VIP
// when getOrderApp
// then should return orderVIP app
//
// given order.Type is Normal
// when getOrderApp
// then should return orderNormal app
func TestBotApp_getOrderApp(t *testing.T) {
	orderVIP := &mockOrderApp{}
	orderNormal := &mockOrderApp{}

	app := NewBotApp(orderVIP, orderNormal, &mockEventBus{})

	vipOrder := domain.NewOrder(1, domain.OrderTypeVIP)
	if got := app.getOrderApp(*vipOrder); got != domain.OrderApp(orderVIP) {
		t.Errorf("expected returned app to be orderVIP")
	}

	normalOrder := domain.NewOrder(1, domain.OrderTypeNormal)
	if got := app.getOrderApp(*normalOrder); got != domain.OrderApp(orderNormal) {
		t.Errorf("expected returned app to be orderNormal")
	}
}

// given empty bot
// when wait
// then no PickOrder called
func TestBotApp_Wait_Empty(t *testing.T) {
	orderVIP := &mockOrderApp{}
	orderNormal := &mockOrderApp{}

	app := NewBotApp(orderVIP, orderNormal, &mockEventBus{})

	app.Wait()

	if orderVIP.pickCalled || orderNormal.pickCalled {
		t.Error("expected PickOrder not to be called when there are no bots")
	}
}

// given 1 bot with a processing order
// when wait()
// then no PickOrder called
func TestBotApp_Wait_SkipsProcessingBot(t *testing.T) {
	orderVIP := &mockOrderApp{}
	orderNormal := &mockOrderApp{}

	app := NewBotApp(orderVIP, orderNormal, &mockEventBus{})

	bot := app.AddBot()
	bot.Order = domain.NewOrder(1, domain.OrderTypeNormal)
	bot.Order.Status = domain.OrderStatusProcessing

	app.Wait()

	if orderVIP.pickCalled || orderNormal.pickCalled {
		t.Error("expected PickOrder not to be called when the bot is processing")
	}
}

// given 1 bot AND 2 sec processing duration
// when wait
// and orderApp.Process without error
// then PickOrder called
// and bot picks up the order
// and after processing completes with no more orders, bot becomes IDLE
func TestBotApp_Wait_ProcessesIdleBot(t *testing.T) {
	order := domain.NewOrder(1, domain.OrderTypeNormal)

	eventBus := &mockEventBus{}
	orderVIP := &mockOrderApp{}
	orderNormal := &mockOrderApp{pickReturn: order, processDuration: 2 * time.Second, event: eventBus}

	app := NewBotApp(orderVIP, orderNormal, eventBus)
	bot := app.AddBot()

	app.Wait()

	if !orderNormal.pickCalled {
		t.Error("expected PickOrder to be called")
	}
	if bot.Order != order {
		t.Errorf("expected bot.Order to be %v, got %v", order, bot.Order)
	}

	app.wg.Wait()

	if !eventBus.orderPickedUpCalled {
		t.Error("expected eventBus.OrderPickedUp to be called")
	}
	if !eventBus.orderCompletedCalled {
		t.Error("expected eventBus.OrderCompleted to be called")
	}

	orderNormal.pickReturn = nil
	app.Wait()

	if bot.Status != domain.BotStatusIdle {
		t.Errorf("expected bot status to be %q after no more orders, got %q", domain.BotStatusIdle, bot.Status)
	}
	if !eventBus.botIdleCalled {
		t.Error("expected eventBus.BotIdle to be called")
	}
}
