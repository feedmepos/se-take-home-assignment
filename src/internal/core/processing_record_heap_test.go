package core

import (
	"container/heap"
	"testing"
	"time"

	"se-order/src/internal/core/model"
)

func TestProcessingRecordMinHeapOrdersByFinishAt(t *testing.T) {
	recordHeap := ProcessingRecordMinHeap{}
	heap.Init(&recordHeap)

	lateRecord := newProcessingRecordForHeapTest(1001, 10000001, 20*time.Second)
	earlyRecord := newProcessingRecordForHeapTest(1002, 10000002, 10*time.Second)
	middleRecord := newProcessingRecordForHeapTest(1003, 10000003, 15*time.Second)

	heap.Push(&recordHeap, lateRecord)
	heap.Push(&recordHeap, earlyRecord)
	heap.Push(&recordHeap, middleRecord)

	first := heap.Pop(&recordHeap).(*model.ProcessingRecord)
	second := heap.Pop(&recordHeap).(*model.ProcessingRecord)
	third := heap.Pop(&recordHeap).(*model.ProcessingRecord)

	if got, want := first.Order().ID(), 10000002; got != want {
		t.Fatalf("first popped order = %d, want %d", got, want)
	}
	if got, want := second.Order().ID(), 10000003; got != want {
		t.Fatalf("second popped order = %d, want %d", got, want)
	}
	if got, want := third.Order().ID(), 10000001; got != want {
		t.Fatalf("third popped order = %d, want %d", got, want)
	}
}

func TestProcessingRecordMinHeapPopShrinksLength(t *testing.T) {
	recordHeap := ProcessingRecordMinHeap{}
	heap.Init(&recordHeap)

	heap.Push(&recordHeap, newProcessingRecordForHeapTest(1001, 10000001, 10*time.Second))
	heap.Push(&recordHeap, newProcessingRecordForHeapTest(1002, 10000002, 20*time.Second))

	if got, want := recordHeap.Len(), 2; got != want {
		t.Fatalf("heap len before pop = %d, want %d", got, want)
	}

	heap.Pop(&recordHeap)

	if got, want := recordHeap.Len(), 1; got != want {
		t.Fatalf("heap len after pop = %d, want %d", got, want)
	}
}

func newProcessingRecordForHeapTest(botID, orderID int, finishOffset time.Duration) *model.ProcessingRecord {
	startTime := time.Date(2026, 4, 16, 10, 0, 0, 0, time.UTC)
	bot := model.NewBot(botID, model.BotStatusBusy, 10*time.Second)
	order := model.NewOrder(orderID, model.PriorityNormal, model.OrderStatusProcessing)
	return model.NewProcessingRecord(bot, order, startTime, startTime.Add(finishOffset))
}
