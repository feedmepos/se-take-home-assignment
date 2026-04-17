package app

import (
	"bufio"
	"fmt"
	"io"
	"strings"
	"time"

	"se-order/src/internal/core"
	"se-order/src/internal/output"
	"se-order/src/internal/protocol"
)

type Runner struct {
	controller *core.Controller
	writer     *output.Writer
}

func NewRunner(controller *core.Controller, writer *output.Writer) *Runner {
	return &Runner{
		controller: controller,
		writer:     writer,
	}
}

func (r *Runner) Run(input io.Reader, interactive bool) error {
	if err := r.writeRunHeader(interactive); err != nil {
		return err
	}

	scanner := bufio.NewScanner(input)
	for {
		if err := r.writePrompt(interactive); err != nil {
			return err
		}

		if !scanner.Scan() {
			return r.handleScanEnd(scanner, interactive)
		}

		shouldExit, err := r.handleLine(scanner.Text(), interactive)
		if err != nil {
			return err
		}
		if shouldExit {
			return r.handleRunExit(interactive)
		}
	}
}

func (r *Runner) writeRunHeader(interactive bool) error {
	// Both interactive mode and file mode should start from the same visible report header.
	if err := r.writer.RawLine("McDonald's Order Management System - Simulation Results"); err != nil {
		return err
	}
	if err := r.writer.RawLine(""); err != nil {
		return err
	}
	return r.writer.Line(r.now(), "System initialized with 0 bots")
}

func (r *Runner) writePrompt(interactive bool) error {
	if !interactive {
		return nil
	}

	_, err := fmt.Fprint(r.writerTarget(), "> ")
	return err
}

func (r *Runner) handleScanEnd(scanner *bufio.Scanner, interactive bool) error {
	if err := scanner.Err(); err != nil {
		return err
	}
	return r.handleRunExit(interactive)
}

func (r *Runner) handleLine(line string, interactive bool) (bool, error) {
	trimmedLine := strings.TrimSpace(normalizeInputLine(line))
	if trimmedLine == "" || strings.HasPrefix(trimmedLine, protocol.CommentPrefix) {
		return false, nil
	}

	shouldExit, err := r.Execute(trimmedLine)
	if err == nil {
		return shouldExit, nil
	}
	return r.handleCommandError(err, interactive)
}

func (r *Runner) handleRunExit(interactive bool) error {
	if interactive {
		return nil
	}
	return r.writeFinalStatus()
}

func (r *Runner) handleCommandError(err error, interactive bool) (bool, error) {
	if writeErr := r.writer.Line(r.now(), "error="+err.Error()); writeErr != nil {
		return false, writeErr
	}
	if interactive {
		return false, nil
	}
	return false, nil
}

func normalizeInputLine(line string) string {
	buffer := make([]rune, 0, len(line))
	runes := []rune(line)
	for index := 0; index < len(runes); index++ {
		char := runes[index]
		switch char {
		case '\b', 0x7f:
			if len(buffer) > 0 {
				buffer = buffer[:len(buffer)-1]
			}
		case '^':
			if index+1 >= len(runes) {
				buffer = append(buffer, char)
				continue
			}
			nextChar := runes[index+1]
			if nextChar == 'H' || nextChar == '?' {
				if len(buffer) > 0 {
					buffer = buffer[:len(buffer)-1]
				}
				index++
				continue
			}
			buffer = append(buffer, char)
		case '\r':
			continue
		default:
			buffer = append(buffer, char)
		}
	}
	return string(buffer)
}

func (r *Runner) writeEvents(events []core.Event) error {
	for _, event := range events {
		if err := r.writer.Line(event.At, event.Message); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runner) writeStatus() error {
	for _, line := range r.controller.Snapshot().SummaryLines() {
		if err := r.writer.Line(r.now(), line); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runner) writeHelp() error {
	for _, line := range r.controller.HelpLines() {
		if err := r.writer.Line(r.now(), line); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runner) now() time.Time {
	return r.controller.Now()
}

func (r *Runner) writerTarget() io.Writer {
	return r.writer.Raw()
}

func (r *Runner) writeFinalStatus() error {
	snapshot := r.controller.Snapshot()
	if err := r.writer.RawLine(""); err != nil {
		return err
	}

	// Keep the footer human-readable because result.txt is meant to be inspected directly in the interview flow.
	if err := r.writer.RawLine("Final Status:"); err != nil {
		return err
	}
	if err := r.writer.RawLine(fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)", snapshot.OrdersTotal, snapshot.VIPCount, snapshot.NormalCount)); err != nil {
		return err
	}
	if err := r.writer.RawLine(fmt.Sprintf("- Orders Completed: %d", snapshot.CompleteCount)); err != nil {
		return err
	}
	if err := r.writer.RawLine(fmt.Sprintf("- Active Bots: %d", len(snapshot.Bots))); err != nil {
		return err
	}
	return r.writer.RawLine(fmt.Sprintf("- Pending Orders: %d", snapshot.PendingCount))
}
