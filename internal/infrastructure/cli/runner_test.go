package cli_test

import (
	"strings"
	"testing"
	"time"

	app "github.com/lijian-bj/se-take-home-assignment/internal/application/ordercontroller"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/cli"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/clock"
	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/logging"
)

func newTestService() *app.Service {
	clk := clock.NewMock(time.Date(2026, 7, 6, 9, 0, 0, 0, time.UTC))
	svc := app.NewService(clk, logging.NewDiscard(clk), 10*time.Millisecond)
	svc.Start()
	return svc
}

func TestExecute_Status(t *testing.T) {
	svc := newTestService()
	if _, err := cli.Execute(svc, "status"); err != nil {
		t.Fatal(err)
	}
}

func TestExecute_WaitUntilIdle(t *testing.T) {
	svc := newTestService()
	if _, err := cli.Execute(svc, "normal"); err != nil {
		t.Fatal(err)
	}
	if _, err := cli.Execute(svc, "+bot"); err != nil {
		t.Fatal(err)
	}
	if _, err := cli.Execute(svc, "wait 15s"); err != nil {
		t.Fatal(err)
	}
	if len(svc.Status().Complete) != 1 {
		t.Fatal("wait should block until order completes")
	}
}

func TestExecute_NormalAndVIP(t *testing.T) {
	svc := newTestService()

	if _, err := cli.Execute(svc, "normal"); err != nil {
		t.Fatal(err)
	}
	if _, err := cli.Execute(svc, "vip"); err != nil {
		t.Fatal(err)
	}

	pending := svc.Status().Pending.OrderIDs()
	if len(pending) != 2 || pending[0] != 2 {
		t.Fatalf("pending=%v want VIP first [2,1]", pending)
	}
}

func TestExecute_AddRemoveBot(t *testing.T) {
	svc := newTestService()

	if _, err := cli.Execute(svc, "+bot"); err != nil {
		t.Fatal(err)
	}
	if _, err := cli.Execute(svc, "+bot"); err != nil {
		t.Fatal(err)
	}
	if _, err := cli.Execute(svc, "-bot"); err != nil {
		t.Fatal(err)
	}
	if len(svc.Status().Bots) != 1 {
		t.Fatalf("expected 1 bot, got %d", len(svc.Status().Bots))
	}
}

func TestExecute_Quit(t *testing.T) {
	svc := newTestService()
	quit, err := cli.Execute(svc, "quit")
	if err != nil {
		t.Fatal(err)
	}
	if !quit {
		t.Fatal("quit should return true")
	}
}

func TestExecute_UnknownCommand(t *testing.T) {
	svc := newTestService()
	_, err := cli.Execute(svc, "invalid")
	if err == nil {
		t.Fatal("expected error for unknown command")
	}
}

func TestExecute_InvalidWait(t *testing.T) {
	svc := newTestService()
	_, err := cli.Execute(svc, "wait not-a-duration")
	if err == nil {
		t.Fatal("expected error for invalid wait duration")
	}
}

func TestRunBatchReader_SkipsCommentsAndBlankLines(t *testing.T) {
	svc := newTestService()
	input := `
# comment
normal

vip
+bot
quit
`
	if err := cli.RunBatchReader(svc, strings.NewReader(input)); err != nil {
		t.Fatal(err)
	}
	pending := svc.Status().Pending.OrderIDs()
	if len(pending) != 1 || pending[0] != 1 {
		t.Fatalf("VIP should be picked first, pending=%v want [1]", pending)
	}
	if id, ok := processingOrderID(svc); !ok || id != 2 {
		t.Fatalf("bot should process VIP #2, got id=%d ok=%v", id, ok)
	}
}

func processingOrderID(svc *app.Service) (int, bool) {
	for _, b := range svc.Status().Bots {
		if b.CurrentOrder != nil {
			return b.CurrentOrder.ID, true
		}
	}
	return 0, false
}

func TestRunBatchReader_ReturnsErrorOnFailure(t *testing.T) {
	svc := newTestService()
	err := cli.RunBatchReader(svc, strings.NewReader("-bot\n"))
	if err == nil {
		t.Fatal("expected error when removing bot with none present")
	}
}
