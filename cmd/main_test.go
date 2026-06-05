package main

import (
	"io"
	"testing"

	"feedmepos_homework/internal/controller"
)

func TestExecuteCLICommandHandlesOrderAndBotCommands(t *testing.T) {
	c := controller.NewController(io.Discard)
	defer c.Stop()

	if exit := executeCLICommand(c, "normal"); exit {
		t.Fatal("normal command should not exit")
	}
	executeCLICommand(c, "vip")
	executeCLICommand(c, "+ bot")

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 1 {
		t.Fatalf("bots = %+v, want one bot", snapshot.Bots)
	}
	if len(snapshot.Pending) != 1 || snapshot.Pending[0].Type != controller.Normal {
		t.Fatalf("pending = %+v, want remaining normal order", snapshot.Pending)
	}
	if snapshot.Bots[0].CurrentOrder == nil || snapshot.Bots[0].CurrentOrder.ID != 2 {
		t.Fatalf("bot current order = %+v, want VIP order 2", snapshot.Bots[0].CurrentOrder)
	}
}

func TestExecuteCLICommandIgnoresBlankCommand(t *testing.T) {
	c := controller.NewController(io.Discard)
	defer c.Stop()

	if exit := executeCLICommand(c, " "); exit {
		t.Fatal("blank command should not exit")
	}

	snapshot := c.Snapshot()
	if len(snapshot.Bots) != 0 || len(snapshot.Pending) != 0 || len(snapshot.Completed) != 0 {
		t.Fatalf("snapshot = %+v, want no state changes", snapshot)
	}
}
