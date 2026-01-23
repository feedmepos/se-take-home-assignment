package controller

import (
	"bytes"
	"io"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestLog(t *testing.T) {
	oldStdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	message := "test message"
	Log(message)

	w.Close()
	os.Stdout = oldStdout

	var buf bytes.Buffer
	io.Copy(&buf, r)
	output := buf.String()

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
