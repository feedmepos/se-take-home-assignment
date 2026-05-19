package cli

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"mcd-order-controller/internal/controller"
)

func newREPL(t *testing.T, input string) (*REPL, *bytes.Buffer, *controller.Controller) {
	t.Helper()
	c := controller.New(controller.Config{ProcessTime: 20 * time.Millisecond})
	out := &bytes.Buffer{}
	r := &REPL{
		C:   c,
		In:  strings.NewReader(input),
		Out: out,
	}
	return r, out, c
}

func TestREPL_HelpOnStart(t *testing.T) {
	r, out, c := newREPL(t, "quit\n")
	defer c.Shutdown()
	r.Run()

	got := out.String()
	for _, want := range []string{
		"McDonald's Order Controller (interactive)",
		"normal | n",
		"vip    | v",
		"bot+   | +",
		"bot-   | -",
		"status | s",
		"quit   | q",
		"bye",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("output missing %q\n----\n%s", want, got)
		}
	}
}

func TestREPL_SubmitOrdersAndStatus(t *testing.T) {
	input := strings.Join([]string{"normal", "vip", "n", "v", "status", "quit"}, "\n") + "\n"
	r, out, c := newREPL(t, input)
	defer c.Shutdown()
	r.Run()

	got := out.String()
	for _, want := range []string{
		"submitted normal order #1001",
		"submitted vip order #1002",
		"submitted normal order #1003",
		"submitted vip order #1004",
		"--- Status ---",
		"Pending (4)",
		"VIP Order #1002",
		"VIP Order #1004",
		"NORMAL Order #1001",
		"NORMAL Order #1003",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("output missing %q\n----\n%s", want, got)
		}
	}
}

func TestREPL_BotLifecycleAndAliases(t *testing.T) {
	input := strings.Join([]string{"+", "normal", "vip", "-", "quit"}, "\n") + "\n"
	r, out, c := newREPL(t, input)
	defer c.Shutdown()
	r.Run()

	got := out.String()
	for _, want := range []string{
		"added bot #1",
		"submitted normal order",
		"submitted vip order",
		"removed bot #1",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("output missing %q\n----\n%s", want, got)
		}
	}
}

func TestREPL_RemoveBotWhenNonePrintsError(t *testing.T) {
	r, out, c := newREPL(t, "bot-\nquit\n")
	defer c.Shutdown()
	r.Run()

	if !strings.Contains(out.String(), "error: no bots to remove") {
		t.Fatalf("expected error message, got:\n%s", out.String())
	}
}

func TestREPL_UnknownCommand(t *testing.T) {
	r, out, c := newREPL(t, "frybot\nquit\n")
	defer c.Shutdown()
	r.Run()

	if !strings.Contains(out.String(), `unknown command: "frybot"`) {
		t.Fatalf("expected unknown command message, got:\n%s", out.String())
	}
}

func TestREPL_BlankLineIsIgnored(t *testing.T) {
	r, out, c := newREPL(t, "\n\nquit\n")
	defer c.Shutdown()
	r.Run()

	if strings.Contains(out.String(), "unknown command") {
		t.Fatalf("blank lines must not produce errors, got:\n%s", out.String())
	}
}

func TestREPL_EOFExitsCleanly(t *testing.T) {
	r, _, c := newREPL(t, "")
	defer c.Shutdown()

	done := make(chan struct{})
	go func() {
		r.Run()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("REPL did not return on EOF within 1s")
	}
}
