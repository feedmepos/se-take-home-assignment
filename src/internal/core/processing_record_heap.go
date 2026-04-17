package core

import "se-order/src/internal/core/model"

type ProcessingRecordMinHeap []*model.ProcessingRecord

func (h ProcessingRecordMinHeap) Len() int {
	return len(h)
}

func (h ProcessingRecordMinHeap) Less(i, j int) bool {
	return h[i].FinishAt().Before(h[j].FinishAt())
}

func (h ProcessingRecordMinHeap) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
}

func (h *ProcessingRecordMinHeap) Push(x any) {
	*h = append(*h, x.(*model.ProcessingRecord))
}

func (h *ProcessingRecordMinHeap) Pop() any {
	if len(*h) == 0 {
		return nil // 或 panic
	}
	old := *h
	last := len(old) - 1
	item := old[last]
	*h = old[:last]
	return item
}
