package controller

import (
	"sync"
	"time"
)

type botEventType int

const (
	botEventCompleted botEventType = iota
	botEventCanceled
)

type botEvent struct {
	Type     botEventType
	BotID    int
	OrderID  int
	At       time.Time
	Duration time.Duration
}

type botProcessResult int

const (
	botProcessCompleted botProcessResult = iota
	botProcessCanceled
)

type botWorker struct {
	id          int
	assignments chan WorkAssignment
	stopCh      chan struct{}
	stopOnce    sync.Once
	events      chan<- botEvent
}

const processingSteps = 10

func newBotWorker(id int, events chan<- botEvent) *botWorker {
	return &botWorker{
		id:          id,
		assignments: make(chan WorkAssignment),
		stopCh:      make(chan struct{}),
		events:      events,
	}
}

func (w *botWorker) start() {
	go w.run()
}

func (w *botWorker) assign(assignment WorkAssignment) bool {
	select {
	case w.assignments <- assignment:
		return true
	case <-w.stopCh:
		return false
	}
}

func (w *botWorker) stop() {
	w.stopOnce.Do(func() {
		close(w.stopCh)
	})
}

func (w *botWorker) run() {
	for {
		select {
		case assignment := <-w.assignments:
			if w.processAssignment(assignment) == botProcessCanceled {
				return
			}
		case <-w.stopCh:
			return
		}
	}
}

func (w *botWorker) processAssignment(assignment WorkAssignment) botProcessResult {
	startedAt := time.Now()

	for step := 0; step < processingSteps; step++ {
		timer := time.NewTimer(time.Second)
		select {
		case <-timer.C:
		case <-w.stopCh:
			timer.Stop()
			canceledAt := time.Now()
			w.events <- botEvent{
				Type:     botEventCanceled,
				BotID:    assignment.BotID,
				OrderID:  assignment.OrderID,
				At:       canceledAt,
				Duration: canceledAt.Sub(startedAt),
			}
			return botProcessCanceled
		}
	}

	completedAt := time.Now()
	event := botEvent{
		Type:     botEventCompleted,
		BotID:    assignment.BotID,
		OrderID:  assignment.OrderID,
		At:       completedAt,
		Duration: completedAt.Sub(startedAt),
	}
	w.events <- event
	return botProcessCompleted
}
