package infrastructure

import (
	"sync"
	"testing"
	"time"
)

func TestSnowflake_NextID(t *testing.T) {
	sf, err := NewSnowflake(1)
	if err != nil {
		t.Fatalf("failed to create snowflake: %v", err)
	}

	id, err := sf.NextID()
	if err != nil {
		t.Fatalf("failed to generate ID: %v", err)
	}

	if id == 0 {
		t.Error("generated ID should not be zero")
	}

	extractedRestaurantID := sf.ExtractRestaurantID(id)
	if extractedRestaurantID != 1 {
		t.Errorf("expected restaurant ID 1, got %d", extractedRestaurantID)
	}

	extractedTime := sf.ExtractTimestamp(id)
	timeDiff := time.Since(extractedTime)
	if timeDiff < 0 || timeDiff > time.Second {
		t.Errorf("extracted timestamp is not reasonable: %v", extractedTime)
	}
}

func TestSnowflake_Uniqueness(t *testing.T) {
	sf, err := NewSnowflake(1)
	if err != nil {
		t.Fatalf("failed to create snowflake: %v", err)
	}

	const count = 10000
	ids := make(map[uint64]bool)

	for i := 0; i < count; i++ {
		id, err := sf.NextID()
		if err != nil {
			t.Fatalf("failed to generate ID at iteration %d: %v", i, err)
		}

		if ids[id] {
			t.Fatalf("duplicate ID generated: %d", id)
		}
		ids[id] = true
	}

	if len(ids) != count {
		t.Errorf("expected %d unique IDs, got %d", count, len(ids))
	}
}

func TestSnowflake_Concurrent(t *testing.T) {
	sf, err := NewSnowflake(1)
	if err != nil {
		t.Fatalf("failed to create snowflake: %v", err)
	}

	const numGoroutines = 100
	const idsPerGoroutine = 1000

	var wg sync.WaitGroup
	idChan := make(chan uint64, numGoroutines*idsPerGoroutine)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < idsPerGoroutine; j++ {
				id, err := sf.NextID()
				if err != nil {
					t.Errorf("failed to generate ID: %v", err)
					return
				}
				idChan <- id
			}
		}()
	}

	wg.Wait()
	close(idChan)

	ids := make(map[uint64]bool)
	for id := range idChan {
		if ids[id] {
			t.Fatalf("duplicate ID generated in concurrent test: %d", id)
		}
		ids[id] = true
	}

	expectedCount := numGoroutines * idsPerGoroutine
	if len(ids) != expectedCount {
		t.Errorf("expected %d unique IDs, got %d", expectedCount, len(ids))
	}
}

func TestSnowflake_RestaurantIsolation(t *testing.T) {
	sf1, err := NewSnowflake(1)
	if err != nil {
		t.Fatalf("failed to create snowflake for restaurant 1: %v", err)
	}

	sf2, err := NewSnowflake(2)
	if err != nil {
		t.Fatalf("failed to create snowflake for restaurant 2: %v", err)
	}

	id1, err := sf1.NextID()
	if err != nil {
		t.Fatalf("failed to generate ID for restaurant 1: %v", err)
	}

	id2, err := sf2.NextID()
	if err != nil {
		t.Fatalf("failed to generate ID for restaurant 2: %v", err)
	}

	extractedRestaurantID1 := sf1.ExtractRestaurantID(id1)
	extractedRestaurantID2 := sf2.ExtractRestaurantID(id2)

	if extractedRestaurantID1 != 1 {
		t.Errorf("expected restaurant ID 1, got %d", extractedRestaurantID1)
	}

	if extractedRestaurantID2 != 2 {
		t.Errorf("expected restaurant ID 2, got %d", extractedRestaurantID2)
	}

	if id1 == id2 {
		t.Error("IDs from different restaurants should be different")
	}

	const count = 1000
	ids1 := make(map[uint64]bool)
	ids2 := make(map[uint64]bool)

	for i := 0; i < count; i++ {
		id1, _ := sf1.NextID()
		id2, _ := sf2.NextID()
		ids1[id1] = true
		ids2[id2] = true
	}

	for id := range ids1 {
		if ids2[id] {
			t.Errorf("ID collision between restaurants: %d", id)
		}
	}
}

func TestSnowflake_Increasing(t *testing.T) {
	sf, err := NewSnowflake(1)
	if err != nil {
		t.Fatalf("failed to create snowflake: %v", err)
	}

	const count = 1000
	var prevID uint64 = 0

	for i := 0; i < count; i++ {
		id, err := sf.NextID()
		if err != nil {
			t.Fatalf("failed to generate ID at iteration %d: %v", i, err)
		}

		if id <= prevID {
			t.Errorf("ID should be increasing: prev=%d, current=%d", prevID, id)
		}
		prevID = id
	}
}

func TestSnowflake_InvalidRestaurantID(t *testing.T) {
	_, err := NewSnowflake(1024)
	if err == nil {
		t.Error("expected error for invalid restaurant ID")
	}

	if err != ErrInvalidRestaurantID {
		t.Errorf("expected ErrInvalidRestaurantID, got %v", err)
	}
}

func TestSnowflake_MaxRestaurantID(t *testing.T) {
	sf, err := NewSnowflake(1023)
	if err != nil {
		t.Fatalf("failed to create snowflake with max restaurant ID: %v", err)
	}

	id, err := sf.NextID()
	if err != nil {
		t.Fatalf("failed to generate ID: %v", err)
	}

	extractedRestaurantID := sf.ExtractRestaurantID(id)
	if extractedRestaurantID != 1023 {
		t.Errorf("expected restaurant ID 1023, got %d", extractedRestaurantID)
	}
}
