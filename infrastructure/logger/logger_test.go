package logger

import (
	"bytes"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeClock returns a fixed, predetermined time on every call to Now().
type fakeClock struct {
	t time.Time
}

func (f fakeClock) Now() time.Time {
	return f.t
}

var lineTimestampRE = regexp.MustCompile(`^\[\d{2}:\d{2}:\d{2}\] `)

func TestLogf_FormatsFixedTimestampAndMessage(t *testing.T) {
	fixed := time.Date(2024, 1, 2, 13, 5, 9, 0, time.UTC)
	var buf bytes.Buffer

	l := New(&buf, fakeClock{t: fixed})
	l.Logf("order %d created", 42)

	got := buf.String()
	want := "[13:05:09] order 42 created\n"
	if got != want {
		t.Fatalf("Logf output = %q, want %q", got, want)
	}
	if !lineTimestampRE.MatchString(got) {
		t.Fatalf("Logf output %q does not match timestamp prefix regex", got)
	}
}

func TestLogf_ConcurrentCallsProduceNonInterleavedLines(t *testing.T) {
	fixed := time.Date(2024, 1, 2, 13, 5, 9, 0, time.UTC)
	var buf bytes.Buffer

	l := New(&buf, fakeClock{t: fixed})

	const n = 50
	var wg sync.WaitGroup
	wg.Add(n)
	for i := range n {
		go func() {
			defer wg.Done()
			l.Logf("message-%d", i)
		}()
	}
	wg.Wait()

	out := buf.String()
	lines := strings.Split(strings.TrimRight(out, "\n"), "\n")

	if len(lines) != n {
		t.Fatalf("got %d lines, want %d (possible interleaving); output:\n%s", len(lines), n, out)
	}

	seen := make(map[string]bool, n)
	for _, line := range lines {
		if !lineTimestampRE.MatchString(line + " ") {
			t.Errorf("line %q does not start with an HH:MM:SS timestamp", line)
		}
		if seen[line] {
			t.Errorf("duplicate line detected (possible interleaving): %q", line)
		}
		seen[line] = true
	}
	if len(seen) != n {
		t.Fatalf("expected %d distinct complete lines, got %d", n, len(seen))
	}
}
