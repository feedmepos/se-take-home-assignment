// ABOUTME: Tests command dispatch for the order controller executable.
// ABOUTME: Keeps CLI argument behavior covered without spawning a subprocess.
package main

import (
	"bytes"
	"strings"
	"testing"
)

func TestRunDefaultsToDemoMode(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer

	code := run(nil, strings.NewReader(""), &stdout, &stderr)

	if code != 0 {
		t.Fatalf("exit code = %d, want 0; stderr: %s", code, stderr.String())
	}
	if !strings.Contains(stdout.String(), "Simulation Results") {
		t.Fatalf("stdout missing demo output:\n%s", stdout.String())
	}
}

func TestRunRejectsUnknownMode(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer

	code := run([]string{"unknown"}, strings.NewReader(""), &stdout, &stderr)

	if code != 1 {
		t.Fatalf("exit code = %d, want 1", code)
	}
	if !strings.Contains(stderr.String(), "unknown mode") {
		t.Fatalf("stderr missing unknown mode message:\n%s", stderr.String())
	}
}
