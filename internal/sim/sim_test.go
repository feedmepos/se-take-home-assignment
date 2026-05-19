package sim

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestRun_ProducesTimestampedArtifact(t *testing.T) {
	var buf bytes.Buffer
	Run(&buf, 20*time.Millisecond)

	got := buf.String()
	if got == "" {
		t.Fatal("Run produced empty output")
	}

	ts := regexp.MustCompile(`\[\d{2}:\d{2}:\d{2}\]`)
	if !ts.MatchString(got) {
		t.Fatalf("output missing HH:MM:SS timestamp\n----\n%s", got)
	}

	for _, want := range []string{
		"McDonald's Order Management System - Simulation Results",
		"System initialized with 0 bots",
		"--- Submitting initial orders",
		"Created NORMAL Order #1001",
		"Created VIP Order #1002",
		"Created NORMAL Order #1003",
		"--- Adding two bots ---",
		"Bot #1 created - Status: ACTIVE",
		"Bot #2 created - Status: ACTIVE",
		"--- Submitting a late VIP order ---",
		"Created VIP Order #1004",
		"--- Removing newest bot mid-processing",
		"returned to PENDING",
		"--- Adding a bot to drain the queue ---",
		"Bot #3 created - Status: ACTIVE",
		"--- Removing remaining bot while IDLE ---",
		"destroyed while IDLE",
		"--- Status ---",
		"Completed (4):",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("output missing %q\n----\n%s", want, got)
		}
	}
}

func TestRun_VIPPickedUpBeforeWaitingNormal(t *testing.T) {
	var buf bytes.Buffer
	Run(&buf, 20*time.Millisecond)
	got := buf.String()

	vipPickup := strings.Index(got, "picked up VIP Order #1002")
	laterNormalPickup := strings.Index(got, "picked up NORMAL Order #1003")
	if vipPickup == -1 || laterNormalPickup == -1 {
		t.Fatalf("missing pickup lines in output:\n%s", got)
	}
	if vipPickup > laterNormalPickup {
		t.Fatalf("VIP #1002 must be picked up before queued Normal #1003 (vip=%d normal=%d)",
			vipPickup, laterNormalPickup)
	}
}

func TestRun_AllFourOrdersComplete(t *testing.T) {
	var buf bytes.Buffer
	Run(&buf, 20*time.Millisecond)
	got := buf.String()

	for _, id := range []string{"#1001", "#1002", "#1003", "#1004"} {
		needle := "completed " // any "Bot #X completed ... Order #N"
		if !strings.Contains(got, needle) || !strings.Contains(got, id) {
			t.Fatalf("missing completion for order %s\n----\n%s", id, got)
		}
	}

	if !strings.Contains(got, "Completed (4):") {
		t.Fatalf("final snapshot must show Completed (4), got:\n%s", got)
	}
}
