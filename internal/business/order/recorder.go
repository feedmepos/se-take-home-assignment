package order

import (
	"fmt"
	"io"
	"time"
)

type Recorder struct {
	w      io.Writer
	events []Event
}

func NewRecorder(w io.Writer) *Recorder { return &Recorder{w: w} }

func (r *Recorder) Record(ts time.Time, msg string) {
	r.events = append(r.events, Event{Timestamp: ts, Message: msg})
	fmt.Fprintf(r.w, "[%s] %s\n", ts.Format("15:04:05"), msg)
}

func (r *Recorder) WriteSummary() {
	fmt.Fprintln(r.w, "")
	fmt.Fprintf(r.w, "=== Demo Summary ===\n")
	fmt.Fprintf(r.w, "Total events: %d\n", len(r.events))
}
