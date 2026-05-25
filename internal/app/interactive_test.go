// ABOUTME: Tests interactive command handling for the order controller CLI.
// ABOUTME: Uses real command text without mocking controller behavior.
package app

import (
	"bytes"
	"strings"
	"testing"
)

func TestRunInteractiveHandlesBasicCommands(t *testing.T) {
	input := strings.NewReader("normal\nvip\n+\nstatus\nquit\n")
	var output bytes.Buffer

	if err := RunInteractive(input, &output); err != nil {
		t.Fatalf("RunInteractive returned error: %v", err)
	}

	result := output.String()
	requiredText := []string{
		"Created Normal Order #1",
		"Created VIP Order #2",
		"Bot #1 created",
		"Pending Orders: 1",
		"Processing Orders: 1",
		"Goodbye",
	}
	for _, text := range requiredText {
		if !strings.Contains(result, text) {
			t.Fatalf("interactive output missing %q in:\n%s", text, result)
		}
	}
}
