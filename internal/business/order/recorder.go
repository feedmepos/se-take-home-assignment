package order

import (
	"fmt"
	"io"
	"time"
)

// Recorder captures timestamped events and writes them to an io.Writer.
type Recorder struct {
	w      io.Writer
	events []Event
}

// NewRecorder creates a Recorder that writes output to the given writer.
func NewRecorder(w io.Writer) *Recorder { return &Recorder{w: w} }

// Record appends an event with the given timestamp and message, then writes
// a formatted line (HH:MM:SS) to the underlying writer.
func (r *Recorder) Record(ts time.Time, msg string) {
	r.events = append(r.events, Event{Timestamp: ts, Message: msg})
	fmt.Fprintf(r.w, "[%s] %s\n", ts.Format("15:04:05"), msg)
}

// WriteSummary prints a summary of recorded events to the underlying writer.
func (r *Recorder) WriteSummary() {
	fmt.Fprintln(r.w, "")
	fmt.Fprintf(r.w, "=== Demo Summary ===\n")
	fmt.Fprintf(r.w, "Total events: %d\n", len(r.events))
}
