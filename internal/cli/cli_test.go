package cli

import (
	"bytes"
	"strings"
	"testing"
)

func TestRunHandlesInteractiveOrderFlow(t *testing.T) {
	input := strings.NewReader("normal\nvip\n+bot\nstatus\nadvance 10\nstatus\nquit\n")
	var out bytes.Buffer

	if err := Run(input, &out); err != nil {
		t.Fatalf("Run() error got %v, want nil", err)
	}

	got := out.String()
	for _, want := range []string{
		"Interactive CLI",
		"Created Normal Order #1 - Status: PENDING",
		"Created VIP Order #2 - Status: PENDING",
		"Bot #1 picked up VIP Order #2 - Status: PROCESSING",
		"PENDING: Normal Order #1",
		"Bot #1 completed VIP Order #2 - Status: COMPLETE",
		"Bot #1 picked up Normal Order #1 - Status: PROCESSING",
		"COMPLETE: VIP Order #2",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("Run() output missing %q:\n%s", want, got)
		}
	}
}

func TestRunRemovesNewestBusyBotAndRequeuesOrder(t *testing.T) {
	input := strings.NewReader("normal\n+bot\nvip\n+bot\n-bot\nstatus\nquit\n")
	var out bytes.Buffer

	if err := Run(input, &out); err != nil {
		t.Fatalf("Run() error got %v, want nil", err)
	}

	got := out.String()
	for _, want := range []string{
		"Bot #2 destroyed - Status: REMOVED",
		"VIP Order #2 returned to PENDING after Bot #2 was removed",
		"PENDING: VIP Order #2",
		"PROCESSING: Bot #1 -> Normal Order #1",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("Run() output missing %q:\n%s", want, got)
		}
	}
}
