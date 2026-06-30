package controller

import (
	"fmt"
	"strings"
	"time"
)

const (
	defaultFirstOrderID = 1001
	defaultFirstBotID   = 1
)

type OrderKind string

const (
	NormalOrder OrderKind = "Normal"
	VIPOrder    OrderKind = "VIP"
)

type OrderStatus string

const (
	OrderPending    OrderStatus = "PENDING"
	OrderProcessing OrderStatus = "PROCESSING"
	OrderComplete   OrderStatus = "COMPLETE"
)

type BotStatus string

const (
	BotIdle       BotStatus = "IDLE"
	BotProcessing BotStatus = "PROCESSING"
)

type LogEntry struct {
	At      time.Time
	Message string
}

func (l LogEntry) String() string {
	return fmt.Sprintf("[%s] %s", l.At.Format("15:04:05"), l.Message)
}

type OrderView struct {
	ID     int
	Kind   OrderKind
	Status OrderStatus
}

type BotView struct {
	ID             int
	Status         BotStatus
	CurrentOrderID int
}

type Snapshot struct {
	Pending    []OrderView
	Processing []OrderView
	Completed  []OrderView
	Bots       []BotView
}

type Controller struct {
	nextOrderID int
	nextBotID   int

	vipPending    []*order
	normalPending []*order
	// completed 只为 CLI/demo 的状态摘要保留在内存中。真实长期运行的 Web 服务
	// 应该把完成订单持久化，或通过分页/时间窗口查询，避免内存无限增长。
	completed []*order
	bots      []*bot
	botsByID  map[int]*bot
	orders    map[int]*order
}

type order struct {
	id              int
	kind            OrderKind
	status          OrderStatus
	processingBotID int
}

type bot struct {
	id             int
	status         BotStatus
	currentOrderID int
}

func New() *Controller {
	return &Controller{
		nextOrderID: defaultFirstOrderID,
		nextBotID:   defaultFirstBotID,
		botsByID:    make(map[int]*bot),
		orders:      make(map[int]*order),
	}
}

func NewDefault() *Controller {
	return New()
}

func (c *Controller) Initialized(now time.Time) []LogEntry {
	return []LogEntry{c.log(now, "System initialized with 0 bots")}
}

func (c *Controller) AddOrder(kind OrderKind, now time.Time) []LogEntry {
	if kind != VIPOrder {
		kind = NormalOrder
	}

	o := &order{
		id:     c.nextOrderID,
		kind:   kind,
		status: OrderPending,
	}
	c.nextOrderID++
	c.orders[o.id] = o
	c.returnToPendingQueue(o)

	return []LogEntry{c.log(now, "Created %s Order #%d - Status: %s", o.kind, o.id, o.status)}
}

func (c *Controller) AddBot(now time.Time) (int, []LogEntry) {
	b := &bot{
		id:     c.nextBotID,
		status: BotIdle,
	}
	c.nextBotID++
	c.bots = append(c.bots, b)
	c.botsByID[b.id] = b

	return b.id, []LogEntry{c.log(now, "Bot #%d created - Status: %s", b.id, b.status)}
}

func (c *Controller) RemoveNewestBot(now time.Time) (int, int, []LogEntry) {
	if len(c.bots) == 0 {
		return 0, 0, []LogEntry{c.log(now, "No bot available to destroy")}
	}
	return c.removeBotAt(len(c.bots)-1, now)
}

func (c *Controller) removeBotAt(removeIndex int, now time.Time) (int, int, []LogEntry) {
	b := c.bots[removeIndex]
	orderID := b.currentOrderID
	c.bots = append(c.bots[:removeIndex], c.bots[removeIndex+1:]...)
	delete(c.botsByID, b.id)

	if orderID != 0 {
		return b.id, orderID, []LogEntry{c.log(now, "Bot #%d destroyed - Cancellation requested for Order #%d", b.id, orderID)}
	}

	return b.id, 0, []LogEntry{c.log(now, "Bot #%d destroyed", b.id)}
}

func (c *Controller) CancelOrder(botID, orderID int, now time.Time, actualDuration time.Duration) ([]LogEntry, bool) {
	return c.cancelAssignedOrder(botID, orderID, now, actualDuration)
}

func (c *Controller) cancelAssignedOrder(botID, orderID int, now time.Time, actualDuration time.Duration) ([]LogEntry, bool) {
	o := c.orders[orderID]
	if o == nil ||
		o.status != OrderProcessing ||
		o.processingBotID != botID ||
		c.botsByID[botID] != nil {
		return nil, false
	}

	o.status = OrderPending
	o.processingBotID = 0
	c.returnToPendingQueue(o)

	return []LogEntry{
		c.log(now, "Bot #%d canceled %s Order #%d after %s - Order returned to PENDING", botID, o.kind, o.id, formatDuration(actualDuration)),
	}, true
}

func (c *Controller) AssignNextOrder(botID int, now time.Time) (*WorkAssignment, []LogEntry) {
	b := c.botsByID[botID]
	if b == nil {
		return nil, nil
	}

	o := c.popNextPending()
	if o == nil {
		b.status = BotIdle
		b.currentOrderID = 0
		return nil, nil
	}

	o.status = OrderProcessing
	o.processingBotID = b.id
	b.status = BotProcessing
	b.currentOrderID = o.id

	assignment := &WorkAssignment{
		BotID:   b.id,
		OrderID: o.id,
		Kind:    o.kind,
	}
	return assignment, []LogEntry{c.log(now, "Bot #%d picked up %s Order #%d - Status: %s", b.id, o.kind, o.id, o.status)}
}

func (c *Controller) ReturnAssignedOrder(assignment WorkAssignment, now time.Time) []LogEntry {
	b := c.botsByID[assignment.BotID]
	if b != nil && b.status == BotProcessing && b.currentOrderID == assignment.OrderID {
		b.status = BotIdle
		b.currentOrderID = 0
	}

	o := c.orders[assignment.OrderID]
	if o == nil || o.status != OrderProcessing {
		return nil
	}

	o.status = OrderPending
	o.processingBotID = 0
	c.returnToPendingQueue(o)
	return []LogEntry{
		c.log(now, "Bot #%d could not receive %s Order #%d - Order returned to PENDING", assignment.BotID, o.kind, o.id),
	}
}

func (c *Controller) CompleteOrder(botID, orderID int, now time.Time, actualDuration time.Duration) (*WorkAssignment, []LogEntry) {
	o := c.orders[orderID]
	if o != nil && o.status == OrderProcessing && o.processingBotID == botID && c.botsByID[botID] == nil {
		logs, _ := c.cancelAssignedOrder(botID, orderID, now, actualDuration)
		return nil, logs
	}

	b := c.botsByID[botID]
	if b == nil || b.status != BotProcessing || b.currentOrderID != orderID {
		return nil, nil
	}

	if o == nil || o.status != OrderProcessing {
		return nil, nil
	}

	o.status = OrderComplete
	o.processingBotID = 0
	c.completed = append(c.completed, o)
	b.status = BotIdle
	b.currentOrderID = 0

	logs := []LogEntry{
		c.log(now, "Bot #%d completed %s Order #%d - Status: %s (Processing time: %s)",
			b.id,
			o.kind,
			o.id,
			o.status,
			formatDuration(actualDuration),
		),
	}

	next, nextLogs := c.AssignNextOrder(botID, now)
	if next == nil {
		logs = append(logs, c.log(now, "Bot #%d is now IDLE - No pending orders", botID))
		return nil, logs
	}

	logs = append(logs, nextLogs...)
	return next, logs
}

func (c *Controller) Status(now time.Time) []LogEntry {
	snapshot := c.Snapshot()
	return []LogEntry{
		c.log(now, "Status: bots=%s pending=%s processing=%s complete=%s",
			formatBots(snapshot.Bots),
			formatOrders(snapshot.Pending),
			formatOrders(snapshot.Processing),
			formatOrders(snapshot.Completed),
		),
	}
}

func (c *Controller) Summary(now time.Time) []LogEntry {
	snapshot := c.Snapshot()
	vipCompleted := 0
	normalCompleted := 0
	for _, o := range snapshot.Completed {
		if o.Kind == VIPOrder {
			vipCompleted++
		} else {
			normalCompleted++
		}
	}

	return []LogEntry{
		c.log(now, "Final Status: total_orders=%d completed=%d vip_completed=%d normal_completed=%d active_bots=%d pending=%d",
			len(c.orders),
			len(snapshot.Completed),
			vipCompleted,
			normalCompleted,
			len(snapshot.Bots),
			len(snapshot.Pending),
		),
		c.log(now, "Completed Orders: %s", formatOrders(snapshot.Completed)),
		c.log(now, "Pending Orders: %s", formatOrders(snapshot.Pending)),
	}
}

func (c *Controller) Snapshot() Snapshot {
	snapshot := Snapshot{
		Pending:   make([]OrderView, 0, c.pendingCount()),
		Completed: make([]OrderView, 0, len(c.completed)),
		Bots:      make([]BotView, 0, len(c.bots)),
	}

	for _, o := range c.vipPending {
		snapshot.Pending = append(snapshot.Pending, orderView(o))
	}
	for _, o := range c.normalPending {
		snapshot.Pending = append(snapshot.Pending, orderView(o))
	}

	for _, o := range c.completed {
		snapshot.Completed = append(snapshot.Completed, orderView(o))
	}

	for orderID := defaultFirstOrderID; orderID < c.nextOrderID; orderID++ {
		if o := c.orders[orderID]; o != nil && o.status == OrderProcessing {
			snapshot.Processing = append(snapshot.Processing, orderView(o))
		}
	}

	for _, b := range c.bots {
		snapshot.Bots = append(snapshot.Bots, BotView{
			ID:             b.id,
			Status:         b.status,
			CurrentOrderID: b.currentOrderID,
		})
	}

	return snapshot
}

func (c *Controller) idleBotIDs() []int {
	ids := make([]int, 0, len(c.bots))
	for _, b := range c.bots {
		if b.status == BotIdle {
			ids = append(ids, b.id)
		}
	}
	return ids
}

func (c *Controller) returnToPendingQueue(o *order) {
	// 订单回到待处理队列时保持原始优先级：VIP 回 VIP 队列，Normal 回 Normal 队列。
	// 同一队列内按订单号恢复 FIFO，因此取消的旧订单会排在后创建的同类订单前面。
	if o.kind == VIPOrder {
		c.vipPending = insertByOriginalOrderID(c.vipPending, o)
		return
	}
	c.normalPending = insertByOriginalOrderID(c.normalPending, o)
}

func (c *Controller) popNextPending() *order {
	if len(c.vipPending) > 0 {
		o := c.vipPending[0]
		c.vipPending = c.vipPending[1:]
		return o
	}
	if len(c.normalPending) > 0 {
		o := c.normalPending[0]
		c.normalPending = c.normalPending[1:]
		return o
	}
	return nil
}

func (c *Controller) pendingCount() int {
	return len(c.vipPending) + len(c.normalPending)
}

func insertByOriginalOrderID(queue []*order, o *order) []*order {
	insertAt := len(queue)
	for i, existing := range queue {
		if o.id < existing.id {
			insertAt = i
			break
		}
	}

	queue = append(queue, nil)
	copy(queue[insertAt+1:], queue[insertAt:])
	queue[insertAt] = o
	return queue
}

func orderView(o *order) OrderView {
	return OrderView{
		ID:     o.id,
		Kind:   o.kind,
		Status: o.status,
	}
}

func (c *Controller) log(now time.Time, format string, args ...any) LogEntry {
	return LogEntry{
		At:      now,
		Message: fmt.Sprintf(format, args...),
	}
}

func formatOrders(orders []OrderView) string {
	if len(orders) == 0 {
		return "[]"
	}

	parts := make([]string, 0, len(orders))
	for _, o := range orders {
		parts = append(parts, fmt.Sprintf("#%d %s %s", o.ID, o.Kind, o.Status))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func formatBots(bots []BotView) string {
	if len(bots) == 0 {
		return "[]"
	}

	parts := make([]string, 0, len(bots))
	for _, b := range bots {
		if b.Status == BotProcessing {
			parts = append(parts, fmt.Sprintf("#%d %s order=#%d", b.ID, b.Status, b.CurrentOrderID))
			continue
		}
		parts = append(parts, fmt.Sprintf("#%d %s", b.ID, b.Status))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func formatDuration(duration time.Duration) string {
	if duration%time.Second == 0 {
		return fmt.Sprintf("%ds", int(duration/time.Second))
	}
	return duration.String()
}
