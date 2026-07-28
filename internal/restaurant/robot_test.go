package restaurant

import "testing"

func TestRobotFleetAddsDefaultAndNamedRobots(t *testing.T) {
	robots := newRobotFleet()

	defaultRobot := robots.add("")
	namedRobot := robots.add("Grill Master")

	if defaultRobot.ID != 1 || defaultRobot.Name != "Bot #1" {
		t.Fatalf("default robot = ID %d, name %q; want ID 1, name %q", defaultRobot.ID, defaultRobot.Name, "Bot #1")
	}
	if namedRobot.ID != 2 || namedRobot.Name != "Grill Master" {
		t.Fatalf("named robot = ID %d, name %q; want ID 2, name %q", namedRobot.ID, namedRobot.Name, "Grill Master")
	}
	if namedRobot.Status != Idle {
		t.Fatalf("new robot status = %s, want IDLE", namedRobot.Status)
	}
}

func TestRobotFleetRemovesNewestRobot(t *testing.T) {
	robots := newRobotFleet()
	first := robots.add("")
	second := robots.add("")

	removed, ok := robots.removeNewest()
	if !ok {
		t.Fatal("removeNewest() returned ok = false, want true")
	}
	if removed != second {
		t.Fatalf("removed robot = %q, want newest robot %q", removed.Name, second.Name)
	}
	if got := robots.snapshot(); len(got) != 1 || got[0].ID != first.ID {
		t.Fatalf("remaining robots = %+v, want only robot ID %d", got, first.ID)
	}
	if _, ok := robots.removeNewest(); !ok {
		t.Fatal("removeNewest() after one robot returned ok = false, want true")
	}
	if _, ok := robots.removeNewest(); ok {
		t.Fatal("removeNewest() on an empty fleet returned ok = true, want false")
	}
}
