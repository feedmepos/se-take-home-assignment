package controller

import (
	"regexp"
	"strings"
	"testing"
	"time"

	"example.com/order-controller/pkg/testutil"
)

func TestLog(t *testing.T) {
	old := testutil.CaptureOutput()
	message := "test message"
	Log(message)
	output := old()
	if !strings.Contains(output, message) {
		t.Errorf("Expected output to contain: %q, got: %q", message, output)
	}
	matched, _ := regexp.MatchString(`^\[\d{2}:\d{2}:\d{2}\]`, output)
	if !matched {
		t.Errorf("Expected timestamp format [HH:MM:SS], got: %q", output)
	}
}

func TestTimestamp(t *testing.T) {
	ts := timestamp()
	_, err := time.Parse("[15:04:05]", ts)
	if err != nil {
		t.Errorf("Timestamp format is incorrect: %v", err)
	}
}
