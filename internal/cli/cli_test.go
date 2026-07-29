package cli_test

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/cli"
	"github.com/Splinglove/se-take-home-assignment/internal/controller"
)

func TestFormatLog_HHMMSS(t *testing.T) {
	ts := time.Date(2026, 7, 29, 14, 32, 1, 0, time.UTC)
	got := cli.FormatLog(ts, "System ready")
	want := "[14:32:01] System ready"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestHandleLine_NewOrdersAndStatus(t *testing.T) {
	var buf bytes.Buffer
	c := controller.New(time.Hour, func(msg string) {
		buf.WriteString(cli.FormatLog(time.Now(), msg) + "\n")
	})
	app := cli.New(c, strings.NewReader(""), &buf)
	app.HandleLine("n")
	app.HandleLine("v")
	app.HandleLine("s")
	out := buf.String()
	if !strings.Contains(out, "Order #1") || !strings.Contains(out, "Order #2") {
		t.Fatalf("missing order logs: %s", out)
	}
	if !strings.Contains(out, "PENDING") {
		t.Fatalf("status missing PENDING: %s", out)
	}
}
