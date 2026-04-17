package core

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"se-order/src/internal/clock"
	"se-order/src/internal/core/model"
	"se-order/src/internal/protocol"
)

type Event struct {
	At      time.Time
	Message string
}

type Snapshot struct {
	OrdersTotal     int
	PendingCount    int
	ProcessingCount int
	CompleteCount   int
	VIPCount        int
	NormalCount     int
	PendingVIP      []int
	PendingNormal   []int
	Processing      []string
	Complete        []int
	Bots            []string
}

type Controller struct {
	clock          clock.Clock
	store          *model.Store
	flow           *model.FlowManager
	scheduler      *Scheduler
	botProcessTime time.Duration
}

func NewController(clk clock.Clock, botProcessTime time.Duration) *Controller {
	return &Controller{
		clock:          clk,
		store:          model.NewStore(),
		flow:           model.NewFlowManager(),
		scheduler:      NewScheduler(),
		botProcessTime: botProcessTime,
	}
}

func (c *Controller) Now() time.Time {
	return c.clock.Now()
}

func (c *Controller) NewOrder(priority model.OrderPriority) EventList {
	order := c.store.CreateOrder(priority)
	c.flow.Enqueue(order)
	events := NewEventList(c.eventf("Created %s Order #%s - Status: %s", priorityLabel(priority), model.FormatOrderID(order.ID()), order.Status()))
	_, assignmentEvents := c.assignPendingOrders()
	return events.AppendAll(assignmentEvents)
}

func (c *Controller) AddBot() EventList {
	bot := c.store.CreateBot(c.botProcessTime)
	events := NewEventList(c.eventf("Bot #%s created - Status: ACTIVE", model.FormatBotID(bot.ID())))
	_, assignmentEvents := c.assignPendingOrders()
	return events.AppendAll(assignmentEvents)
}

func (c *Controller) RemoveBot() (EventList, error) {
	bot, ok := c.store.LastBot()
	if !ok {
		return nil, fmt.Errorf("no bot to remove")
	}
	events := NewEventList()

	// If the newest bot is busy, cancel only its in-flight record and push that order back through normal queue rules.
	if order, assigned := c.scheduler.DetachBot(bot.ID()); assigned {
		c.flow.Requeue(order)
		events = events.Append(c.eventf("Bot #%s destroyed while processing %s Order #%s - Order returned to PENDING", model.FormatBotID(bot.ID()), priorityLabel(order.Priority()), model.FormatOrderID(order.ID())))
	}
	if _, ok := c.store.RemoveLastBot(); !ok {
		return nil, fmt.Errorf("no bot to remove")
	}
	if len(events) == 0 {
		events = events.Append(c.eventf("Bot #%s destroyed while IDLE", model.FormatBotID(bot.ID())))
	}
	return events, nil
}

func (c *Controller) Tick(duration time.Duration) (EventList, error) {
	if duration < 0 {
		return nil, fmt.Errorf("duration must be non-negative")
	}
	c.clock.Advance(duration)
	events := NewEventList()

	// First settle every in-flight record that should have finished by "now".
	completed, completedEvents := c.scheduler.Tick(c.clock, c.flow)
	events = events.AppendAll(completedEvents)

	// Any bot that became idle after settlement should immediately try to pick up the next pending order.
	newProcessingRecords, assignmentEvents := c.assignPendingOrders()
	events = events.AppendAll(assignmentEvents)
	events = events.AppendAll(c.buildIdleBotEvents(completed, newProcessingRecords))
	return events, nil
}

func (c *Controller) HelpLines() []string {
	return []string{
		"commands:",
		protocol.FullCommandOrderNormal,
		protocol.FullCommandOrderVIP,
		protocol.FullCommandBotAdd,
		protocol.FullCommandBotRemove,
		protocol.FullCommandTick,
		protocol.CommandStatus,
		protocol.CommandHelp,
		protocol.CommandExit,
	}
}

func (c *Controller) Snapshot() Snapshot {
	pendingVIP := make([]int, 0, len(c.flow.PendingVIP()))
	vipCount := 0
	normalCount := 0
	for _, order := range c.flow.PendingVIP() {
		pendingVIP = append(pendingVIP, order.ID())
	}
	pendingNormal := make([]int, 0, len(c.flow.PendingNormal()))
	for _, order := range c.flow.PendingNormal() {
		pendingNormal = append(pendingNormal, order.ID())
	}
	complete := make([]int, 0, len(c.flow.CompleteOrders()))
	for _, order := range c.flow.CompleteOrders() {
		complete = append(complete, order.ID())
	}

	// Sorting keeps status output stable regardless of the order records were appended internally.
	processingRecords := append([]*model.ProcessingRecord(nil), c.scheduler.ProcessingRecords()...)
	sort.Slice(processingRecords, func(i, j int) bool {
		return processingRecords[i].Bot().ID() < processingRecords[j].Bot().ID()
	})
	processing := make([]string, 0, len(processingRecords))
	for _, record := range processingRecords {
		processing = append(processing, fmt.Sprintf("bot:%d->order:%d", record.Bot().ID(), record.Order().ID()))
	}
	bots := make([]string, 0, len(c.store.Bots()))
	for _, bot := range c.store.Bots() {
		bots = append(bots, fmt.Sprintf("%d:%s", bot.ID(), bot.Status()))
	}
	for _, order := range c.store.Orders() {
		if order.Priority() == model.PriorityVIP {
			vipCount++
			continue
		}
		normalCount++
	}
	return Snapshot{
		OrdersTotal:     len(c.store.Orders()),
		PendingCount:    len(pendingVIP) + len(pendingNormal),
		ProcessingCount: len(processing),
		CompleteCount:   len(complete),
		VIPCount:        vipCount,
		NormalCount:     normalCount,
		PendingVIP:      pendingVIP,
		PendingNormal:   pendingNormal,
		Processing:      processing,
		Complete:        complete,
		Bots:            bots,
	}
}

func (c *Controller) eventf(format string, args ...any) Event {
	return Event{
		At:      c.clock.Now(),
		Message: fmt.Sprintf(format, args...),
	}
}

func (c *Controller) assignPendingOrders() ([]*model.ProcessingRecord, EventList) {
	processingRecords := c.scheduler.AssignOrdersToIdleBots(c.clock.Now(), c.store.Bots(), c.flow)
	events := NewEventList()
	for _, record := range processingRecords {
		events = events.Append(c.eventf("Bot #%s picked up %s Order #%s - Status: PROCESSING", model.FormatBotID(record.Bot().ID()), priorityLabel(record.Order().Priority()), model.FormatOrderID(record.Order().ID())))
	}
	return processingRecords, events
}

func (c *Controller) buildIdleBotEvents(completed []*model.ProcessingRecord, assigned []*model.ProcessingRecord) EventList {
	assignedBotIDs := map[int]struct{}{}
	for _, record := range assigned {
		assignedBotIDs[record.Bot().ID()] = struct{}{}
	}

	events := NewEventList()
	for _, record := range completed {
		if _, ok := assignedBotIDs[record.Bot().ID()]; ok {
			continue
		}
		events = events.Append(c.eventf("Bot #%s is now IDLE - No pending orders", model.FormatBotID(record.Bot().ID())))
	}
	return events
}

func formatCompletedProcessingRecord(record *model.ProcessingRecord) string {
	return fmt.Sprintf("Bot #%s completed %s Order #%s - Status: COMPLETE (Processing time: %s)", model.FormatBotID(record.Bot().ID()), priorityLabel(record.Order().Priority()), model.FormatOrderID(record.Order().ID()), record.Bot().ProcessDuration())
}

func (s Snapshot) SummaryLines() []string {
	return []string{
		fmt.Sprintf("orders total=%d pending=%d processing=%d complete=%d", s.OrdersTotal, s.PendingCount, s.ProcessingCount, s.CompleteCount),
		fmt.Sprintf("pending_vip=%s", formatInts(s.PendingVIP)),
		fmt.Sprintf("pending_normal=%s", formatInts(s.PendingNormal)),
		fmt.Sprintf("processing=%s", formatStrings(s.Processing)),
		fmt.Sprintf("complete=%s", formatInts(s.Complete)),
		fmt.Sprintf("bots=%s", formatStrings(s.Bots)),
	}
}

func formatInts(values []int) string {
	if len(values) == 0 {
		return "[]"
	}
	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, fmt.Sprintf("%d", value))
	}
	return "[" + strings.Join(parts, ",") + "]"
}

func formatStrings(values []string) string {
	if len(values) == 0 {
		return "[]"
	}
	return "[" + strings.Join(values, ",") + "]"
}

func priorityLabel(priority model.OrderPriority) string {
	if priority == model.PriorityVIP {
		return "VIP"
	}
	return "Normal"
}
