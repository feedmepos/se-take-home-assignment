package main

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"order-controller/internal/controller"
)

func TestExecuteCommandAliasesAndStatus(t *testing.T) {
	var out bytes.Buffer
	log := newLogger(&out)
	c := controller.New(controller.Options{
		ProcessDuration: time.Hour,
		OnEvent:         log.event,
	})

	for _, cmd := range []string{" n ", "v", "+", "add bot", "status"} {
		if executeCommand(cmd, c, log) {
			t.Fatalf("command %q should not quit", cmd)
		}
	}

	snap := c.Snapshot()
	if len(snap.Pending) != 0 {
		t.Fatalf("pending = %+v, want empty because two bots should pick both orders", snap.Pending)
	}
	if len(snap.Processing) != 2 {
		t.Fatalf("processing count = %d, want 2", len(snap.Processing))
	}

	text := out.String()
	for _, want := range []string{
		"Normal Order #1 -> PENDING",
		"VIP Order #2 -> PENDING",
		"Bot #1 picked up VIP Order #2 -> PROCESSING",
		"Bot #2 picked up Normal Order #1 -> PROCESSING",
		"Status: pending=[]",
	} {
		if !strings.Contains(text, want) {
			t.Fatalf("output missing %q:\n%s", want, text)
		}
	}
}

func TestExecuteCommandUnknownAndQuit(t *testing.T) {
	var out bytes.Buffer
	log := newLogger(&out)
	c := controller.New(controller.Options{
		ProcessDuration: time.Hour,
		OnEvent:         log.event,
	})

	if executeCommand("wat", c, log) {
		t.Fatal("unknown command should not quit")
	}
	c.AddOrder(controller.VIP)
	c.AddBot()
	if !executeCommand("q", c, log) {
		t.Fatal("q should quit")
	}

	text := out.String()
	for _, want := range []string{
		"Unknown command: wat",
		"Stopping bots and exiting",
		"Bot #1 destroyed",
		"VIP Order #1 returned to PENDING",
	} {
		if !strings.Contains(text, want) {
			t.Fatalf("output missing %q:\n%s", want, text)
		}
	}
}
