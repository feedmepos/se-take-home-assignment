package idgen

import (
	"sync"
	"testing"
)

func TestSequence_SequentialIncreasesByOne(t *testing.T) {
	s := NewSequence(1)
	prev := s.Next()
	if prev != 1 {
		t.Fatalf("first Next() = %d, want 1", prev)
	}
	for range 10 {
		next := s.Next()
		if next != prev+1 {
			t.Fatalf("Next() = %d, want %d", next, prev+1)
		}
		prev = next
	}
}

func TestSequence_ConcurrentUniqueValues(t *testing.T) {
	const goroutines = 100
	const perGoroutine = 100

	s := NewSequence(1)
	results := make(chan int, goroutines*perGoroutine)

	var wg sync.WaitGroup
	wg.Add(goroutines)
	for range goroutines {
		go func() {
			defer wg.Done()
			for range perGoroutine {
				results <- s.Next()
			}
		}()
	}
	wg.Wait()
	close(results)

	seen := make(map[int]bool, goroutines*perGoroutine)
	for v := range results {
		if seen[v] {
			t.Fatalf("duplicate value generated: %d", v)
		}
		seen[v] = true
	}

	if len(seen) != goroutines*perGoroutine {
		t.Fatalf("got %d unique values, want %d", len(seen), goroutines*perGoroutine)
	}
}
