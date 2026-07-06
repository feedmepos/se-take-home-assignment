// Package logging 将结构化事件日志适配到 port.EventLog 端口，输出至 io.Writer。
package logging

import (
	"fmt"
	"io"
	"strings"

	"github.com/lijian-bj/se-take-home-assignment/internal/application/port"
	"github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"
)

// EventLogger 实现 port.EventLog，每行日志前缀 HH:MM:SS 时间戳。
type EventLogger struct {
	w     io.Writer   // 输出目标（通常为 stdout）
	clock port.Clock  // 用于生成时间戳
}

// New 创建写入指定 Writer 的事件日志器。
func New(w io.Writer, c port.Clock) *EventLogger {
	return &EventLogger{w: w, clock: c}
}

// NewDiscard 创建丢弃输出的日志器，用于不需要日志的测试场景。
func NewDiscard(c port.Clock) *EventLogger {
	return New(io.Discard, c)
}

// write 输出带 HH:MM:SS 前缀的格式化日志行。
func (l *EventLogger) write(format string, args ...any) {
	ts := l.clock.Now().Format("15:04:05")
	fmt.Fprintf(l.w, "%s "+format+"\n", append([]any{ts}, args...)...)
}

func (l *EventLogger) SystemStarted() {
	l.write("SYSTEM started")
}

func (l *EventLogger) OrderCreated(order ordercontroller.Order, pending ordercontroller.PendingQueue) {
	l.write("ORDER created id=%d type=%s pending=%s", order.ID, order.Type, formatPending(pending))
}

func (l *EventLogger) BotCreated(id int) {
	l.write("BOT created id=%d", id)
}

func (l *EventLogger) BotPicked(botID int, order ordercontroller.Order, pickupIndex int) {
	l.write("BOT id=%d picked order id=%d pickupIndex=%d", botID, order.ID, pickupIndex)
}

func (l *EventLogger) BotCompleted(botID int, order ordercontroller.Order, complete []int) {
	l.write("BOT id=%d completed order id=%d complete=%s", botID, order.ID, formatInts(complete))
}

func (l *EventLogger) BotIdle(botID int) {
	l.write("BOT id=%d idle", botID)
}

func (l *EventLogger) BotInterrupted(botID int, order ordercontroller.Order, pickupIndex int, pending ordercontroller.PendingQueue) {
	l.write("BOT id=%d interrupted order id=%d reinserted at index=%d pending=%s", botID, order.ID, pickupIndex, formatPending(pending))
}

func (l *EventLogger) BotRemoved(botID int) {
	l.write("BOT removed id=%d", botID)
}

func (l *EventLogger) StatusSnapshot(snap ordercontroller.Snapshot) {
	l.write("STATUS bots=%s pending=%s complete=%s", formatBots(snap.Bots), formatPending(snap.Pending), formatInts(orderIDs(snap.Complete)))
}

func (l *EventLogger) Warn(msg string) {
	l.write("WARN %s", msg)
}

// formatPending 将待处理队列格式化为 [id1,id2,...] 字符串。
func formatPending(q ordercontroller.PendingQueue) string {
	ids := q.OrderIDs()
	if len(ids) == 0 {
		return "[]"
	}
	parts := make([]string, len(ids))
	for i, id := range ids {
		parts[i] = fmt.Sprintf("%d", id)
	}
	return "[" + strings.Join(parts, ",") + "]"
}

// formatInts 将整数切片格式化为 [n1,n2,...] 字符串。
func formatInts(ids []int) string {
	if len(ids) == 0 {
		return "[]"
	}
	parts := make([]string, len(ids))
	for i, id := range ids {
		parts[i] = fmt.Sprintf("%d", id)
	}
	return "[" + strings.Join(parts, ",") + "]"
}

func orderIDs(orders []ordercontroller.Order) []int {
	ids := make([]int, len(orders))
	for i, o := range orders {
		ids[i] = o.ID
	}
	return ids
}

// formatBots 将 Bot 列表格式化为 "1:IDLE,2:PROCESSING:3" 形式。
func formatBots(bots []ordercontroller.Bot) string {
	if len(bots) == 0 {
		return "0"
	}
	parts := make([]string, len(bots))
	for i, b := range bots {
		if b.State == ordercontroller.BotStateProcessing && b.CurrentOrder != nil {
			parts[i] = fmt.Sprintf("%d:PROCESSING:%d", b.ID, b.CurrentOrder.ID)
		} else {
			parts[i] = fmt.Sprintf("%d:IDLE", b.ID)
		}
	}
	return strings.Join(parts, ",")
}
