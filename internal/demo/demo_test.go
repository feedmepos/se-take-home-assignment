package demo

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
)

func TestRunWritesTimestampedScenarios(t *testing.T) {
	var output bytes.Buffer
	if err := Run(&output); err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	text := output.String()
	timestamp := regexp.MustCompile(`\[[0-9]{2}:[0-9]{2}:[0-9]{2}\]`)
	if !timestamp.MatchString(text) {
		t.Fatalf("output does not contain HH:MM:SS timestamps:\n%s", text)
	}

	required := []string{
		"Scenario: VIP priority",
		"Bot #1 picked up VIP order #3",
		"Scenario: bot capacity and automatic completion",
		"Completed VIP order #3",
		"Scenario: removing idle and processing bots",
		"Removed Bot #4; returned NORMAL order #5 to PENDING",
		"Pending Orders: NORMAL #5",
	}
	for _, want := range required {
		if !strings.Contains(text, want) {
			t.Fatalf("output missing %q:\n%s", want, text)
		}
	}
}
