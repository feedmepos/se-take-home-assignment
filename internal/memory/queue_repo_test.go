package memory

import (
	"testing"
)

// given pending is empty
// when Shift()
// should return nil
func TestQueueRepo_Shift_Empty(t *testing.T) {
	q := NewQueueRepo()

	order := q.Shift()

	if order != nil {
		t.Errorf("expected Shift() to return nil, got %v", order)
	}
}
