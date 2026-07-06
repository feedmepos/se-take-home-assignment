package logging_test

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/clock"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/logging"
)

func TestEventLogger_FormatsEvents(t *testing.T) {
	start := time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC)
	clk := clock.NewMock(start)
	var buf bytes.Buffer
	log := logging.New(&buf, clk)

	log.SystemStarted()
	order := ordercontroller.NewOrder(1, ordercontroller.OrderTypeVIP)
	pending := ordercontroller.PendingQueue{VIP: []ordercontroller.Order{order}}
	log.OrderCreated(order, pending)
	log.BotCreated(1)
	log.BotPicked(1, order, 0)
	log.BotCompleted(1, order, []int{1})
	log.BotIdle(1)
	log.BotInterrupted(1, order, 0, pending)
	log.BotRemoved(1)
	log.Warn("test warning")
	log.StatusSnapshot(ordercontroller.Snapshot{
		Bots:     []ordercontroller.Bot{{ID: 1, State: ordercontroller.BotStateIdle}},
		Pending:  pending,
		Complete: []ordercontroller.Order{order},
	})

	out := buf.String()
	checks := []string{
		"09:00:00 SYSTEM started",
		"ORDER created id=1 type=VIP pending=[1]",
		"BOT created id=1",
		"BOT id=1 picked order id=1 pickupIndex=0",
		"BOT id=1 completed order id=1 complete=[1]",
		"BOT id=1 idle",
		"BOT id=1 interrupted order id=1 reinserted at index=0 pending=[1]",
		"BOT removed id=1",
		"WARN test warning",
		"STATUS bots=1:IDLE pending=[1] complete=[1]",
	}
	for _, want := range checks {
		if !strings.Contains(out, want) {
			t.Fatalf("output missing %q\nfull output:\n%s", want, out)
		}
	}
}

func TestEventLogger_EmptyCollections(t *testing.T) {
	clk := clock.NewMock(time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC))
	var buf bytes.Buffer
	log := logging.New(&buf, clk)

	log.StatusSnapshot(ordercontroller.Snapshot{})
	out := buf.String()
	if !strings.Contains(out, "bots=0 pending=[] complete=[]") {
		t.Fatalf("unexpected empty snapshot output: %s", out)
	}
}
