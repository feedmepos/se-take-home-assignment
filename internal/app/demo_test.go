// ABOUTME: Tests CLI-facing demo output for the order controller prototype.
// ABOUTME: Verifies the generated result text is stable and CI-friendly.
package app

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
)

func TestRunDemoWritesTimestampedResults(t *testing.T) {
	var output bytes.Buffer

	if err := RunDemo(&output); err != nil {
		t.Fatalf("RunDemo returned error: %v", err)
	}

	result := output.String()
	timestampPattern := regexp.MustCompile(`\[[0-9]{2}:[0-9]{2}:[0-9]{2}\]`)
	if !timestampPattern.MatchString(result) {
		t.Fatalf("demo output does not contain HH:MM:SS timestamp: %q", result)
	}

	requiredText := []string{
		"McDonald's Order Management System - Simulation Results",
		"Created Normal Order #1",
		"Created VIP Order #2",
		"Bot #1 created",
		"Bot #2 destroyed",
		"Final Status:",
		"Orders Completed: 4",
	}
	for _, text := range requiredText {
		if !strings.Contains(result, text) {
			t.Fatalf("demo output missing %q in:\n%s", text, result)
		}
	}
}
