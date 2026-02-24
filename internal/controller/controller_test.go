package controller

import (
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/dnisting/se-take-home-assignment/internal/bot"
)

func init() {
	bot.ProcessingTime = 100 * time.Millisecond
}

func newTestController() (*Controller, *[]string) {
	var mu sync.Mutex
	var logs []string
	logFunc := func(format string, args ...any) {
		mu.Lock()
		defer mu.Unlock()
		logs = append(logs, fmt.Sprintf(format, args...))
	}
	c := New(logFunc)
	return c, &logs
}

func TestOrderCreationIncrementsIDs(t *testing.T) {
	c, logs := newTestController()
	defer c.Shutdown()

	c.NewNormalOrder()
	c.NewVIPOrder()
	c.NewNormalOrder()

	if len(*logs) != 3 {
		t.Fatalf("expected 3 log entries, got %d", len(*logs))
	}
	if !strings.Contains((*logs)[0], "#1001") {
		t.Errorf("expected order #1001, got: %s", (*logs)[0])
	}
	if !strings.Contains((*logs)[1], "#1002") {
		t.Errorf("expected order #1002, got: %s", (*logs)[1])
	}
	if !strings.Contains((*logs)[2], "#1003") {
		t.Errorf("expected order #1003, got: %s", (*logs)[2])
	}
}

func TestVIPPriorityProcessing(t *testing.T) {
	c, logs := newTestController()
	defer c.Shutdown()

	c.NewNormalOrder()
	c.NewVIPOrder()
	c.NewNormalOrder()

	// Add 1 bot — it should pick up VIP first
	c.AddBot()

	time.Sleep(250 * time.Millisecond)

	found := false
	for _, log := range *logs {
		if strings.Contains(log, "picked up") {
			if !strings.Contains(log, "VIP Order #1002") {
				t.Errorf("expected first pickup to be VIP Order #1002, got: %s", log)
			}
			found = true
			break
		}
	}
	if !found {
		t.Error("no pickup log found")
	}
}

func TestBotProcessesAndCompletes(t *testing.T) {
	c, logs := newTestController()
	defer c.Shutdown()

	c.NewNormalOrder()
	c.AddBot()

	time.Sleep(250 * time.Millisecond)

	hasComplete := false
	for _, log := range *logs {
		if strings.Contains(log, "completed") && strings.Contains(log, "#1001") {
			hasComplete = true
			break
		}
	}
	if !hasComplete {
		t.Error("expected order #1001 to be completed")
	}
}

func TestBotRemovalReturnsOrder(t *testing.T) {
	c, logs := newTestController()
	defer c.Shutdown()

	c.NewNormalOrder()
	c.AddBot()

	// Give the bot just enough time to pick up but not complete
	time.Sleep(20 * time.Millisecond)

	c.RemoveBot()

	hasReturned := false
	for _, log := range *logs {
		if strings.Contains(log, "returned to PENDING") {
			hasReturned = true
			break
		}
	}
	if !hasReturned {
		t.Error("expected order to be returned to PENDING after bot removal")
	}
}
