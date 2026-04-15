package mcdonald

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Logger struct {
	filePath string
	mu       sync.Mutex
}

var globalLogger *Logger

func init() {
	scriptDir := "../scripts"
	const directoryPermission = 0o755
	os.MkdirAll(scriptDir, directoryPermission)

	logFilePath := filepath.Join(scriptDir, "result.txt")
	if _, err := os.Stat(logFilePath); err == nil {
		os.Remove(logFilePath)
	}

	globalLogger = &Logger{
		filePath: logFilePath,
	}
}

func (l *Logger) LogOrderComplete(botID int, orderID int, customerType Customer, processingTime int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf("[%s] Order ID #%d for %s customer completed by Bot #%d in %d seconds - Status: COMPLETE\n",
		timestamp, orderID, string(customerType), botID, processingTime)

	file, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	file.WriteString(message)

	fmt.Println(message)

}

func (l *Logger) LogOrderPickup(botID int, orderID int, customerType Customer) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf("[%s] Bot #%d picked up %s Order #%d - Status: PROCESSING\n",
		timestamp, botID, string(customerType), orderID)

	file, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	file.WriteString(message)

	fmt.Println(message)
}

func (l *Logger) LogOrderCreated(orderID int, customerType Customer) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf("[%s] Created %s Order #%d - Status: PENDING\n",
		timestamp, string(customerType), orderID)

	file, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	file.WriteString(message)

	fmt.Println(message)
}

func (l *Logger) LogBotCreated(botID int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf("[%s] Bot #%d created - Status: ACTIVE\n", timestamp, botID)

	file, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	file.WriteString(message)
	file.Sync()

	fmt.Println(message)
}

func (l *Logger) LogBotRemoved(botID int, status string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	timestamp := time.Now().Format("15:04:05")
	message := fmt.Sprintf("[%s] Bot #%d destroyed while %s\n", timestamp, botID, status)

	file, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	file.WriteString(message)
	file.Sync()

	fmt.Println(message)
}

func (l *Logger) LogFinalStatus(totalCompleted int, totalVIP int, totalNormal int, activeBots int, pendingOrders int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	totalOrders := totalCompleted + pendingOrders
	message := fmt.Sprintf("\nFinal Status:\n")
	message += fmt.Sprintf("- Total Orders Processed: %d (%d VIP, %d Normal)\n", totalOrders, totalVIP, totalNormal)
	message += fmt.Sprintf("- Orders Completed: %d\n", totalCompleted)
	message += fmt.Sprintf("- Active Bots: %d\n", activeBots)
	message += fmt.Sprintf("- Pending Orders: %d\n", pendingOrders)

	file, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	file.WriteString(message)

	fmt.Println(message)

}

func GetLogger() *Logger {
	return globalLogger
}
