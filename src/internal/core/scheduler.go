package core

import (
	"container/heap"
	"time"

	"se-order/src/internal/clock"
	"se-order/src/internal/core/model"
)

type Scheduler struct {
	recordHeap              ProcessingRecordMinHeap
	processingRecordByBotID map[int]*model.ProcessingRecord
}

func NewScheduler() *Scheduler {
	recordHeap := ProcessingRecordMinHeap{}
	heap.Init(&recordHeap)
	return &Scheduler{
		recordHeap:              recordHeap,
		processingRecordByBotID: map[int]*model.ProcessingRecord{},
	}
}

func (s *Scheduler) AssignOrdersToIdleBots(now time.Time, bots []*model.Bot, flow *model.FlowManager) []*model.ProcessingRecord {
	created := []*model.ProcessingRecord{}
	for {
		bot, ok := s.findIdleBot(bots)
		if !ok {
			break
		}

		order, ok := s.getPendingOrder(flow)
		if !ok {
			break
		}

		record := s.processOrder(now, bot, order)
		created = append(created, record)
	}
	return created
}

func (s *Scheduler) DetachBot(botID int) (*model.Order, bool) {
	record, ok := s.processingRecordByBotID[botID]
	if !ok {
		return nil, false
	}
	delete(s.processingRecordByBotID, botID)
	record.Cancel()
	record.Bot().SetStatus(model.BotStatusIdle)
	record.Order().SetStatus(model.OrderStatusPending)
	return record.Order(), true
}

func (s *Scheduler) Tick(clk clock.Clock, flow *model.FlowManager) ([]*model.ProcessingRecord, EventList) {
	now := clk.Now()
	dueProcessingRecords := s.findDueProcessingRecords(now)
	completed := make([]*model.ProcessingRecord, 0, len(dueProcessingRecords))
	events := NewEventList()
	for _, record := range dueProcessingRecords {
		completedRecord, event := s.completeProcessingRecord(flow, record)
		completed = append(completed, completedRecord)
		events = events.Append(event)
	}
	return completed, events
}

func (s *Scheduler) ProcessingRecords() []*model.ProcessingRecord {
	records := make([]*model.ProcessingRecord, 0, len(s.processingRecordByBotID))
	for _, record := range s.processingRecordByBotID {
		records = append(records, record)
	}
	return records
}

func (s *Scheduler) getPendingOrder(flow *model.FlowManager) (*model.Order, bool) {
	// FlowManager owns VIP/Normal ordering, so scheduler only asks for the next eligible order.
	return flow.NextPending()
}

func (s *Scheduler) findIdleBot(bots []*model.Bot) (*model.Bot, bool) {
	for _, bot := range bots {
		if bot.Status() == model.BotStatusIdle {
			return bot, true
		}
	}
	return nil, false
}

func (s *Scheduler) processOrder(now time.Time, bot *model.Bot, order *model.Order) *model.ProcessingRecord {
	order.SetStatus(model.OrderStatusProcessing)
	bot.SetStatus(model.BotStatusBusy)
	record := model.NewProcessingRecord(bot, order, now, now.Add(bot.ProcessDuration()))
	heap.Push(&s.recordHeap, record)
	s.processingRecordByBotID[bot.ID()] = record
	return record
}

func (s *Scheduler) findDueProcessingRecords(now time.Time) []*model.ProcessingRecord {
	dueProcessingRecords := []*model.ProcessingRecord{}
	for s.recordHeap.Len() > 0 {
		record := s.recordHeap[0]
		if record.FinishAt().After(now) {
			break
		}
		record = heap.Pop(&s.recordHeap).(*model.ProcessingRecord)
		if record.IsCanceled() {
			continue
		}
		dueProcessingRecords = append(dueProcessingRecords, record)
	}
	return dueProcessingRecords
}

func (s *Scheduler) completeProcessingRecord(flow *model.FlowManager, record *model.ProcessingRecord) (*model.ProcessingRecord, Event) {
	record.Bot().SetStatus(model.BotStatusIdle)
	flow.Complete(record.Order())
	delete(s.processingRecordByBotID, record.Bot().ID())
	return record, Event{
		At:      record.FinishAt(),
		Message: formatCompletedProcessingRecord(record),
	}
}
