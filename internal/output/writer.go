package output

import (
	"fmt"
	"os"
	"time"

	"McDonald/internal/model"
)

// Writer handles output to both console and file
type Writer struct {
	file *os.File
}

// NewWriter creates a new Writer that writes to the specified file
func NewWriter(filename string) (*Writer, error) {
	file, err := os.Create(filename)
	if err != nil {
		return nil, err
	}
	return &Writer{file: file}, nil
}

// Close closes the file
func (w *Writer) Close() error {
	return w.file.Close()
}

// log prints with timestamp to both console and file
func (w *Writer) log(format string, args ...interface{}) {
	timestamp := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, args...)
	line := fmt.Sprintf("%s - %s", timestamp, msg)

	fmt.Println(line)
	fmt.Fprintln(w.file, line)
}

// OrderCreated logs order creation
func (w *Writer) OrderCreated(order *model.Order) {
	w.log("Order #%d created (%s) - %s", order.ID, order.TypeString(), order.StatusString())
}

// BotCreated logs bot creation
func (w *Writer) BotCreated(bot *model.Bot) {
	if bot.Current != nil {
		w.log("Bot #%d created and processing Order #%d (%s)", bot.ID, bot.Current.ID, bot.Current.TypeString())
	} else {
		w.log("Bot #%d created and idle", bot.ID)
	}
}

// BotProcessing logs bot starting to process an order
func (w *Writer) BotProcessing(bot *model.Bot, order *model.Order) {
	w.log("Bot #%d processing Order #%d (%s)", bot.ID, order.ID, order.TypeString())
}

// BotIdle logs bot becoming idle
func (w *Writer) BotIdle(bot *model.Bot) {
	w.log("Bot #%d idle", bot.ID)
}

// OrderComplete logs order completion
func (w *Writer) OrderComplete(order *model.Order, botID int) {
	w.log("Order #%d (%s) COMPLETE by Bot #%d", order.ID, order.TypeString(), botID)
}

// BotRemoved logs bot removal
func (w *Writer) BotRemoved(bot *model.Bot, returnedOrder bool) {
	if returnedOrder && bot.Current != nil {
		w.log("Bot #%d removed, Order #%d returned to PENDING", bot.ID, bot.Current.ID)
	} else {
		w.log("Bot #%d removed", bot.ID)
	}
}

// NoBotToRemove logs when there's no bot to remove
func (w *Writer) NoBotToRemove() {
	w.log("No bot to remove")
}

// NoOrderToProcess logs when there's no order to process
func (w *Writer) NoOrderToProcess(botID int) {
	w.log("Bot #%d has no order to process", botID)
}

// Status logs system status
func (w *Writer) Status(status string) {
	w.log("=== Status ===")
	for _, line := range parseStatusLines(status) {
		w.log(line)
	}
	w.log("=============")
}

// parseStatusLines splits status into individual lines
func parseStatusLines(status string) []string {
	lines := make([]string, 0)
	current := ""
	for _, char := range status {
		if char == '\n' {
			if current != "" {
				lines = append(lines, current)
				current = ""
			}
		} else {
			current += string(char)
		}
	}
	if current != "" {
		lines = append(lines, current)
	}
	return lines
}
