package domain

import (
	"sync"
	"testing"
)

func TestOrderIDSeq_Monotonic(t *testing.T) {
	var s OrderIDSeq
	var last OrderID
	for i := 0; i < 1000; i++ {
		id := s.Next()
		if id <= last {
			t.Fatalf("not strictly increasing: %d after %d", id, last)
		}
		last = id
	}
	if last != 1000 {
		t.Fatalf("expected last 1000, got %d", last)
	}
}

func TestOrderIDSeq_ConcurrentUnique(t *testing.T) {
	var s OrderIDSeq
	const workers = 64
	const per = 500
	var wg sync.WaitGroup
	ch := make(chan OrderID, workers*per)
	wg.Add(workers)
	for w := 0; w < workers; w++ {
		go func() {
			defer wg.Done()
			for i := 0; i < per; i++ {
				ch <- s.Next()
			}
		}()
	}
	wg.Wait()
	close(ch)
	seen := make(map[OrderID]struct{}, workers*per)
	for id := range ch {
		if _, dup := seen[id]; dup {
			t.Fatalf("duplicate id %d", id)
		}
		seen[id] = struct{}{}
	}
	if len(seen) != workers*per {
		t.Fatalf("want %d unique ids, got %d", workers*per, len(seen))
	}
}

func TestBotIDSeq_Next(t *testing.T) {
	var b BotIDSeq
	if b.Next() != 1 || b.Next() != 2 {
		t.Fatal("unexpected bot ids")
	}
}
