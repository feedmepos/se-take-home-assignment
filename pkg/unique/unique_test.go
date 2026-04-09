package unique

import (
	"testing"
	"time"
)

func TestGenerate(t *testing.T) {
	sf, _ := NewSnowflake(1, 1)

	id1, err := sf.Generate()
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	id2, err := sf.Generate()
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	if id1 == id2 {
		t.Error("Generated IDs should be unique")
	}

	if id1 <= 0 || id2 <= 0 {
		t.Error("Generated IDs should be positive")
	}
}

func TestGenerateUniqueness(t *testing.T) {
	sf, _ := NewSnowflake(1, 1)
	ids := make(map[int64]bool)

	for i := 0; i < 10000; i++ {
		id, err := sf.Generate()
		if err != nil {
			t.Fatalf("Generate() error = %v", err)
		}

		if ids[id] {
			t.Errorf("Duplicate ID generated: %d", id)
		}
		ids[id] = true
	}
}

func TestParseID(t *testing.T) {
	sf, _ := NewSnowflake(5, 3)

	id, _ := sf.Generate()
	timestamp, workerID, datacenterID, sequence := ParseID(id)

	if workerID != 5 {
		t.Errorf("workerID = %d, want 5", workerID)
	}
	if datacenterID != 3 {
		t.Errorf("datacenterID = %d, want 3", datacenterID)
	}
	if sequence < 0 || sequence > 4095 {
		t.Errorf("sequence = %d, want 0-4095", sequence)
	}

	createdTime := IDToTime(id)
	now := time.Now()
	diff := now.Sub(createdTime)
	if diff < 0 || diff > time.Second {
		t.Errorf("IDToTime() = %v, want close to %v", createdTime, now)
	}

	if timestamp != createdTime.UnixMilli() {
		t.Errorf("timestamp = %d, want %d", timestamp, createdTime.UnixMilli())
	}
}

func TestNextID(t *testing.T) {
	id1 := NextID()
	id2 := NextID()

	if id1 == id2 {
		t.Error("NextID() should return unique IDs")
	}

	if id1 <= 0 || id2 <= 0 {
		t.Error("NextID() should return positive IDs")
	}
}
