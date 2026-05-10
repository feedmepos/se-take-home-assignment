package oms

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	OrderCompletion = time.Second * 10
)

type (
	OrderStatus   string
	OrderPriority string
	BotStatus     string
)

const (
	OrderStatus_Pending    OrderStatus = "PENDING"
	OrderStatus_Processing OrderStatus = "PROCESSING"
	OrderStatus_Complete   OrderStatus = "COMPLETE"

	OrderPriority_Normal OrderPriority = "Normal"
	OrderPriority_VIP    OrderPriority = "VIP"

	BotStatus_Processing BotStatus = "Processing"
	BotStatus_Idle       BotStatus = "Idle"
)

var (
	OrderedOrderPrioritys = []OrderPriority{
		OrderPriority_VIP,
		OrderPriority_Normal,
	}
)

type (
	OrderProcessStamp struct {
		BotId     int64
		StartTime *time.Time
		EndTime   *time.Time
	}
	Order struct {
		Id         int64
		Status     OrderStatus
		Priority   OrderPriority
		Completion time.Duration

		Stamps []*OrderProcessStamp

		wg *sync.WaitGroup
	}
	OrderPriorityCh struct {
		cap int
		c   <-chan struct{}
		mu  *sync.RWMutex
		chs map[OrderPriority]chan *Order
	}
	OrderFlow struct {
		ctx     context.Context
		orderId *atomic.Int64

		opc *OrderPriorityCh

		mu     *sync.Mutex
		orders []*Order

		wg *sync.WaitGroup
	}

	Bot struct {
		Id        int64
		CreatedAt time.Time
		Status    BotStatus

		c chan struct{}

		opc *OrderPriorityCh
	}
	BotManager struct {
		ctx context.Context

		botId *atomic.Int64
		mu    *sync.Mutex
		bots  map[int64]*Bot

		opc *OrderPriorityCh
	}
)

type OrderProcessStamps []*OrderProcessStamp

func (sf OrderProcessStamps) String() string {
	s := new(strings.Builder)
	for _, v := range sf {
		fmt.Fprintf(s, "%s ", v.String())
	}
	return s.String()
}
func (sf *OrderProcessStamp) String() string {
	if sf == nil {
		return ""
	}
	fn := func(t *time.Time) string {
		if t == nil {
			return ""
		}
		return t.Format(time.TimeOnly)
	}
	return fmt.Sprintf("[%d %s %s]", sf.BotId, fn(sf.StartTime), fn(sf.EndTime))
}

// Order
func (sf *Order) String() string {
	if sf == nil {
		return ""
	}
	return fmt.Sprintf("%s Order #%d", sf.Priority, sf.Id)
}
func (sf *Order) SetProcessStatus() {
	sf.Status = OrderStatus_Processing
}
func (sf *Order) AddStamp(stamp *OrderProcessStamp) {
	if stamp.EndTime != nil {
		sf.Status = OrderStatus_Complete
		sf.wg.Done()
	}
	sf.Stamps = append(sf.Stamps, stamp)
}

// OrderPriorityCh
func NewOrderPriorityCh(cap int, c <-chan struct{}) *OrderPriorityCh {
	return &OrderPriorityCh{
		cap: cap,
		c:   c,
		mu:  new(sync.RWMutex),
		chs: make(map[OrderPriority]chan *Order),
	}
}

// Produce does not block caller
func (sf *OrderPriorityCh) Produce(one *Order) {
	var ch chan *Order

	sf.mu.RLock()
	ch = sf.chs[one.Priority]
	sf.mu.RUnlock()

	if ch == nil {
		ch = make(chan *Order, sf.cap)
		sf.mu.Lock()
		sf.chs[one.Priority] = ch
		sf.mu.Unlock()
	}
	go func() {
		select {
		case <-sf.c:
			return
		case ch <- one:
		}
	}()
}

// Consume does not block caller
func (sf *OrderPriorityCh) Consume(orderPrioritys []OrderPriority) *Order {
	for _, op := range orderPrioritys {
		sf.mu.RLock()
		ch := sf.chs[op]
		sf.mu.RUnlock()

		if ch == nil {
			continue
		}

		select {
		case order := <-ch:
			return order
		default:
			continue
		}
	}
	return nil
}

// OrderFlow
func NewOrderFlow(ctx context.Context, opc *OrderPriorityCh) *OrderFlow {
	orderFlow := &OrderFlow{
		ctx:     ctx,
		orderId: new(atomic.Int64),
		opc:     opc,
		mu:      new(sync.Mutex),
		wg:      new(sync.WaitGroup),
	}
	orderFlow.orderId.Add(1000)
	return orderFlow
}
func (sf *OrderFlow) AddOrder(priority OrderPriority) int64 {
	one := &Order{
		Id:         sf.orderId.Add(1),
		Status:     OrderStatus_Pending,
		Priority:   priority,
		Completion: OrderCompletion,
		wg:         sf.wg,
	}

	sf.mu.Lock()
	sf.orders = append(sf.orders, one)
	sf.mu.Unlock()

	sf.wg.Add(1)
	sf.opc.Produce(one)
	return one.Id
}
func (sf *OrderFlow) GetOrders() []*Order {
	sf.mu.Lock()
	defer sf.mu.Unlock()
	res := make([]*Order, len(sf.orders))
	copy(res, sf.orders)
	return res
}
func (sf *OrderFlow) Wait() { sf.wg.Wait() }

// BotManager
func NewBotManager(ctx context.Context, opc *OrderPriorityCh) *BotManager {
	bm := &BotManager{
		ctx:   ctx,
		botId: new(atomic.Int64),
		mu:    new(sync.Mutex),
		bots:  make(map[int64]*Bot),
		opc:   opc,
	}
	go func() {
		<-ctx.Done()
		bm.mu.Lock()
		for _, bot := range bm.bots {
			bot.End()
		}
		bm.bots = make(map[int64]*Bot)
		bm.mu.Unlock()
	}()
	return bm
}
func (sf *BotManager) IncrBot() int {
	bot := newBot(sf.botId.Add(1), sf.opc)

	count := 0
	sf.mu.Lock()
	sf.bots[bot.Id] = bot
	count = len(sf.bots)
	sf.mu.Unlock()

	go bot.Start()
	return count
}

func (sf *BotManager) DecrBot() error {
	var bot *Bot

	sf.mu.Lock()
	for _, v := range sf.bots {
		if bot == nil || bot.CreatedAt.Before(v.CreatedAt) {
			bot = v
		}
	}
	if bot != nil {
		delete(sf.bots, bot.Id)
	}
	sf.mu.Unlock()

	if bot != nil {
		bot.End()
	}

	return nil
}
func (sf *BotManager) CountActiveBot() int {
	sf.mu.Lock()
	defer sf.mu.Unlock()
	return len(sf.bots)
}

// Bot
func newBot(id int64, opc *OrderPriorityCh) *Bot {
	return &Bot{
		Id:        id,
		CreatedAt: time.Now(),
		Status:    BotStatus_Idle,
		c:         make(chan struct{}),
		opc:       opc,
	}
}
func (sf *Bot) Start() error {
	Log(-1, fmt.Sprintf("Bot #%d created", sf.Id))
	for {
		select {
		case <-sf.c:
			Log(LogType_BotIdleEnd, fmt.Sprintf("Bot #%d destroyed while IDLE", sf.Id))
			return nil
		default:
			one := sf.opc.Consume(OrderedOrderPrioritys)
			if one == nil {
				time.Sleep(time.Second)
				continue
			}
			if err := sf.process(one); err != nil {
				Log(LogType_BotProcessingEnd, err.Error())
				sf.opc.Produce(one)
				return nil
			}
		}
	}
}
func (sf *Bot) process(one *Order) error {
	sf.Status = BotStatus_Processing
	defer func() { sf.Status = BotStatus_Idle }()

	one.SetProcessStatus()
	Log(LogType_BotPickOrder, fmt.Sprintf("Bot #%d picked up %s", sf.Id, one.String()))

	st := time.Now()
	stamp := &OrderProcessStamp{
		BotId:     sf.Id,
		StartTime: &st,
	}
	defer func() { one.AddStamp(stamp) }()

	tr := time.NewTicker(time.Second)
	defer tr.Stop()

	for {
		select {
		case <-sf.c:
			return fmt.Errorf("Bot #%d destroyed while processing %s", sf.Id, one.String())
		case nw := <-tr.C:
			if nw.Sub(st) >= one.Completion {
				stamp.EndTime = &nw
				Log(LogType_BotCompleteOrder, fmt.Sprintf("Bot #%d completed %s", sf.Id, one.String()))
				return nil
			}
		}
	}
}
func (sf *Bot) End() { close(sf.c) }

// utils
type LogType int

const (
	LogType_BotPickOrder LogType = iota
	LogType_BotProcessingEnd
	LogType_BotIdleEnd
	LogType_BotCompleteOrder
)

var logTypeColors = map[LogType][2]string{
	LogType_BotPickOrder:     {"\033[36m", "\033[0m"},
	LogType_BotProcessingEnd: {"\033[31m", "\033[0m"},
	LogType_BotIdleEnd:       {"\033[33m", "\033[0m"},
	LogType_BotCompleteOrder: {"\033[34m", "\033[0m"},
}

func Log(ty LogType, s string) {
	fmt.Printf("%s [%s] %s %s\n", logTypeColors[ty][0], time.Now().Format(time.TimeOnly), s, logTypeColors[ty][1])
}
