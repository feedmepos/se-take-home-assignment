package sim

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
)

func TestRunDemoWritesTimestampedResult(t *testing.T) {
	var out bytes.Buffer
	if err := RunDemo(&out); err != nil {
		t.Fatalf("RunDemo() error got %v, want nil", err)
	}

	got := out.String()
	if !regexp.MustCompile(`[0-9]{2}:[0-9]{2}:[0-9]{2}`).MatchString(got) {
		t.Fatalf("RunDemo() output missing HH:MM:SS timestamp:\n%s", got)
	}

	for _, want := range []string{
		"Created VIP Order",
		"Status: COMPLETE",
		"returned to PENDING",
		"Final Status:",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("RunDemo() output missing %q:\n%s", want, got)
		}
	}
}
