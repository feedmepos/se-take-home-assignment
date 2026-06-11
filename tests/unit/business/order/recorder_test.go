package order_test

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"foundation-cli/internal/business/order"
)

func TestRecorder_HHMMSS(t *testing.T) {
	var b bytes.Buffer
	r := order.NewRecorder(&b)
	r.Record(time.Date(2026, 6, 11, 8, 5, 3, 0, time.UTC), "test")
	if !strings.Contains(b.String(), "[08:05:03] test") {
		t.Fatalf("got: %s", b.String())
	}
}

func TestRecorder_Summary(t *testing.T) {
	var b bytes.Buffer
	r := order.NewRecorder(&b)
	r.Record(time.Now(), "e1")
	r.Record(time.Now(), "e2")
	r.WriteSummary()
	if !strings.Contains(b.String(), "Total events: 2") {
		t.Fatalf("got: %s", b.String())
	}
}
