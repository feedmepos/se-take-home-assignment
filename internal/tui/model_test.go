package tui

import (
	"regexp"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/feedmepos/se-take-home-assignment/internal/controller"
)

func TestViewDoesNotOverflowWindowWidth(t *testing.T) {
	for _, width := range []int{90, 120, 160} {
		m := newModel()
		m.width = width
		m.height = 40
		m.now = time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
		m.controller.CreateOrder(controller.NormalOrder, m.now)
		m.controller.CreateOrder(controller.VIPOrder, m.now.Add(time.Second))
		m.controller.AddBot(m.now.Add(2 * time.Second))

		for lineNumber, line := range strings.Split(m.View(), "\n") {
			if lineWidth := lipgloss.Width(line); lineWidth > width {
				t.Fatalf("width %d line %d rendered at %d cells: %q", width, lineNumber+1, lineWidth, line)
			}
		}
	}
}

func TestViewKeepsTableHeadersOnOneLine(t *testing.T) {
	m := newModel()
	m.width = 180
	m.height = 40
	view := stripANSI(m.View())

	requiredHeaderLines := [][]string{
		{"TYPE", "ORDER", "CREATED"},
		{"BOT", "ORDER", "LEFT"},
		{"TYPE", "ORDER", "DONE"},
	}
	for _, fields := range requiredHeaderLines {
		if !hasLineContaining(view, fields...) {
			t.Fatalf("expected one line containing %q in view:\n%s", fields, view)
		}
	}
}

func TestRowsUseFixedLeftAlignedColumns(t *testing.T) {
	const contentWidth = 60
	orderColumn := columnPos(contentWidth, 1)
	timeColumn := columnPos(contentWidth, 2)

	row := stripANSI(orderRow(contentWidth, normalBadgeStyle.Render("NORMAL"), "#17", "00:32:42"))
	if got, want := strings.Index(row, "#17"), orderColumn; got != want {
		t.Fatalf("order id column starts at %d, want %d in %q", got, want, row)
	}
	if got, want := strings.Index(row, "00:32:42"), timeColumn; got != want {
		t.Fatalf("time column starts at %d, want %d in %q", got, want, row)
	}

	bot := stripANSI(botRow(contentWidth, "Bot #1", normalBadgeStyle.Render("NORMAL")+" #14", "02s"))
	if got, want := strings.Index(bot, " NORMAL"), orderColumn; got != want {
		t.Fatalf("bot order column starts at %d, want %d in %q", got, want, bot)
	}
	if got, want := strings.Index(bot, "02s"), timeColumn; got != want {
		t.Fatalf("left column starts at %d, want %d in %q", got, want, bot)
	}
}

func TestColumnPositionsAreEvenlySpaced(t *testing.T) {
	for _, contentWidth := range []int{28, 60, 121} {
		firstGap := columnPos(contentWidth, 1)
		secondGap := columnPos(contentWidth, 2) - columnPos(contentWidth, 1)
		if firstGap != secondGap && firstGap+1 != secondGap && firstGap != secondGap+1 {
			t.Fatalf("expected columns to be evenly spaced for width %d, got gaps %d and %d", contentWidth, firstGap, secondGap)
		}
	}
}

func TestPanelRenderingUsesScrollOffset(t *testing.T) {
	now := time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
	orders := make([]controller.Order, 0, 12)
	for i := 1; i <= 12; i++ {
		orders = append(orders, controller.Order{
			ID:        i,
			Type:      controller.NormalOrder,
			Status:    controller.PendingStatus,
			CreatedAt: now.Add(time.Duration(i) * time.Second),
		})
	}

	view := stripANSI(renderPending(orders, 60, 4))
	if strings.Contains(view, "#4") {
		t.Fatalf("expected scrolled view to hide order #4:\n%s", view)
	}
	for _, expected := range []string{"#5", "#12", "5-12/12"} {
		if !strings.Contains(view, expected) {
			t.Fatalf("expected scrolled view to contain %q:\n%s", expected, view)
		}
	}
}

func TestEventLogScrollsBackFromLatestEvents(t *testing.T) {
	now := time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
	events := make([]controller.Event, 0, 10)
	for i := 1; i <= 10; i++ {
		events = append(events, controller.Event{
			Time:    now.Add(time.Duration(i) * time.Second),
			Message: "event " + orderID(i),
		})
	}

	latest := stripANSI(renderEvents(events, 70, 0))
	if strings.Contains(latest, "event #3") || !strings.Contains(latest, "event #10") {
		t.Fatalf("expected latest event window by default:\n%s", latest)
	}

	older := stripANSI(renderEvents(events, 70, 4))
	if !strings.Contains(older, "event #1") || strings.Contains(older, "event #10") {
		t.Fatalf("expected scrolled event window to show older logs:\n%s", older)
	}
}

func TestMouseWheelScrollsPanelUnderPointer(t *testing.T) {
	now := time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
	m := newModel()
	m.width = 210
	m.height = 40
	m.now = now
	for i := 0; i < 12; i++ {
		m.controller.CreateOrder(controller.NormalOrder, now.Add(time.Duration(i)*time.Second))
	}

	pendingHit := findPanelHitBox(t, m, panelPending)
	updated, _ := m.Update(tea.MouseMsg{
		X:    pendingHit.x + 1,
		Y:    pendingHit.y + 1,
		Type: tea.MouseWheelDown,
	})

	scrolled := updated.(model)
	if scrolled.scroll.pending != 1 {
		t.Fatalf("expected pending panel to scroll, got offset %d", scrolled.scroll.pending)
	}
	if scrolled.scroll.processing != 0 || scrolled.scroll.completed != 0 || scrolled.scroll.events != 0 {
		t.Fatalf("expected only pending panel to scroll, got %+v", scrolled.scroll)
	}
	if scrolled.focused != panelPending {
		t.Fatalf("expected mouse wheel to focus pending, got %s", scrolled.focused.label())
	}
}

func TestMouseWheelScrollsProcessingPanelUnderPointer(t *testing.T) {
	now := time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
	m := newModel()
	m.width = 210
	m.height = 40
	m.now = now
	for i := 0; i < 12; i++ {
		m.controller.AddBot(now.Add(time.Duration(i) * time.Second))
	}

	processingHit := findPanelHitBox(t, m, panelProcessing)
	updated, _ := m.Update(tea.MouseMsg{
		X:    processingHit.x + 1,
		Y:    processingHit.y + 1,
		Type: tea.MouseWheelDown,
	})

	scrolled := updated.(model)
	if scrolled.scroll.processing != 1 {
		t.Fatalf("expected processing panel to scroll, got offset %d", scrolled.scroll.processing)
	}
	if scrolled.scroll.pending != 0 || scrolled.scroll.completed != 0 || scrolled.scroll.events != 0 {
		t.Fatalf("expected only processing panel to scroll, got %+v", scrolled.scroll)
	}
	if scrolled.focused != panelProcessing {
		t.Fatalf("expected mouse wheel to focus processing, got %s", scrolled.focused.label())
	}
}

func TestMouseWheelOutsidePanelsDoesNotScroll(t *testing.T) {
	now := time.Date(2026, 6, 18, 9, 0, 0, 0, time.UTC)
	m := newModel()
	m.width = 210
	m.height = 40
	m.now = now
	for i := 0; i < 12; i++ {
		m.controller.CreateOrder(controller.NormalOrder, now.Add(time.Duration(i)*time.Second))
	}

	updated, _ := m.Update(tea.MouseMsg{X: 0, Y: 0, Type: tea.MouseWheelDown})
	scrolled := updated.(model)
	if scrolled.scroll != (scrollState{}) {
		t.Fatalf("expected outside wheel event to leave scroll state unchanged, got %+v", scrolled.scroll)
	}
}

func findPanelHitBox(t *testing.T, m model, panel panelID) panelHitBox {
	t.Helper()
	layout := m.buildViewLayout(m.controller.Snapshot(m.now))
	for _, hitBox := range layout.hitBoxes {
		if hitBox.panel == panel {
			return hitBox
		}
	}
	t.Fatalf("panel %s not found in hit boxes: %+v", panel.label(), layout.hitBoxes)
	return panelHitBox{}
}

func hasLineContaining(text string, fields ...string) bool {
	for _, line := range strings.Split(text, "\n") {
		matches := true
		for _, field := range fields {
			if !strings.Contains(line, field) {
				matches = false
				break
			}
		}
		if matches {
			return true
		}
	}
	return false
}

func stripANSI(text string) string {
	return regexp.MustCompile(`\x1b\[[0-9;]*m`).ReplaceAllString(text, "")
}
