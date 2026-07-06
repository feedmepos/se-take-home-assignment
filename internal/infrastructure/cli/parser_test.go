package cli_test

import (
	"strings"
	"testing"
	"time"

	"github.com/lijian-bj/se-take-home-assignment/internal/infrastructure/cli"
)

func TestParse(t *testing.T) {
	tests := []struct {
		line string
		want cli.Command
	}{
		{"normal", cli.CmdNormal},
		{"n", cli.CmdNormal},
		{"vip", cli.CmdVIP},
		{"v", cli.CmdVIP},
		{"+bot", cli.CmdAddBot},
		{"addbot", cli.CmdAddBot},
		{"-bot", cli.CmdRemoveBot},
		{"removebot", cli.CmdRemoveBot},
		{"status", cli.CmdStatus},
		{"s", cli.CmdStatus},
		{"quit", cli.CmdQuit},
		{"q", cli.CmdQuit},
		{"wait 100ms", cli.CmdWait},
		{"  NORMAL  ", cli.CmdNormal},
	}

	for _, tt := range tests {
		got, err := cli.Parse(tt.line)
		if err != nil {
			t.Fatalf("Parse(%q) error: %v", tt.line, err)
		}
		if got != tt.want {
			t.Fatalf("Parse(%q) = %v, want %v", tt.line, got, tt.want)
		}
	}
}

func TestParse_UnknownCommand(t *testing.T) {
	_, err := cli.Parse("foobar")
	if err == nil {
		t.Fatal("expected error for unknown command")
	}
	if !strings.Contains(err.Error(), "foobar") {
		t.Fatalf("error should mention command, got %v", err)
	}
}

func TestParseWaitDuration(t *testing.T) {
	tests := []struct {
		line string
		want time.Duration
	}{
		{"wait 100ms", 100 * time.Millisecond},
		{"WAIT 2s", 2 * time.Second},
	}

	for _, tt := range tests {
		got, err := cli.ParseWaitDuration(tt.line)
		if err != nil {
			t.Fatalf("ParseWaitDuration(%q) error: %v", tt.line, err)
		}
		if got != tt.want {
			t.Fatalf("ParseWaitDuration(%q) = %v, want %v", tt.line, got, tt.want)
		}
	}
}

func TestParseWaitDuration_Invalid(t *testing.T) {
	_, err := cli.ParseWaitDuration("wait bad")
	if err == nil {
		t.Fatal("expected error for invalid duration")
	}
}
