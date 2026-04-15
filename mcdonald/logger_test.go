package mcdonald_test

import (
	"feedme/mcdonald"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func getLogFilePath() string {
	return filepath.Join("../scripts", "result.txt")
}

func TestLoggerOrderComplete(t *testing.T) {
	t.Run("should log order complete with correct format", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		botID := 1
		orderID := 101
		customer := mcdonald.NormalCustomer
		processingTime := 10

		logger.LogOrderComplete(botID, orderID, customer, processingTime)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Order ID #101")
		assert.Contains(t, logContent, "normal customer")
		assert.Contains(t, logContent, "Bot #1")
		assert.Contains(t, logContent, "10 seconds")
		assert.Contains(t, logContent, "COMPLETE")
	})

	t.Run("should log VIP order completion", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogOrderComplete(2, 102, mcdonald.VIPCustomer, 10)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Order ID #102")
		assert.Contains(t, logContent, "vip customer")
		assert.Contains(t, logContent, "Bot #2")
	})
}

func TestLoggerOrderPickup(t *testing.T) {
	t.Run("should log order pickup with correct format", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogOrderPickup(1, 101, mcdonald.NormalCustomer)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Bot #1")
		assert.Contains(t, logContent, "normal Order #101")
		assert.Contains(t, logContent, "PROCESSING")
	})

	t.Run("should log VIP order pickup", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogOrderPickup(2, 102, mcdonald.VIPCustomer)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Bot #2")
		assert.Contains(t, logContent, "vip Order #102")
		assert.Contains(t, logContent, "PROCESSING")
	})
}

func TestLoggerOrderCreated(t *testing.T) {
	t.Run("should log normal order creation", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogOrderCreated(101, mcdonald.NormalCustomer)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Created normal Order #101")
		assert.Contains(t, logContent, "PENDING")
	})

	t.Run("should log VIP order creation", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogOrderCreated(102, mcdonald.VIPCustomer)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Created vip Order #102")
		assert.Contains(t, logContent, "PENDING")
	})

	t.Run("should include timestamp", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogOrderCreated(101, mcdonald.NormalCustomer)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Regexp(t, `\[\d{2}:\d{2}:\d{2}\]`, logContent)
	})
}

func TestLoggerBotCreated(t *testing.T) {
	t.Run("should log bot creation", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogBotCreated(1)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Bot #1 created")
		assert.Contains(t, logContent, "ACTIVE")
	})

	t.Run("should log multiple bots", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogBotCreated(1)
		logger.LogBotCreated(2)
		logger.LogBotCreated(3)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Bot #1")
		assert.Contains(t, logContent, "Bot #2")
		assert.Contains(t, logContent, "Bot #3")
	})
}

func TestLoggerBotRemoved(t *testing.T) {
	t.Run("should log bot removed while processing", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogBotRemoved(1, "PROCESSING")

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Bot #1 destroyed")
		assert.Contains(t, logContent, "PROCESSING")
	})

	t.Run("should log bot removed while idle", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogBotRemoved(1, "IDLE")

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Bot #1 destroyed")
		assert.Contains(t, logContent, "IDLE")
	})
}

func TestLoggerFinalStatus(t *testing.T) {
	t.Run("should log final status with pending orders", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogFinalStatus(2, 1, 1, 0, 2)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Total Orders Processed: 4 (1 VIP, 1 Normal)")
		assert.Contains(t, logContent, "Orders Completed: 2")
		assert.Contains(t, logContent, "Pending Orders: 2")
	})

	t.Run("should log final status with multiple active bots", func(t *testing.T) {
		logger := mcdonald.GetLogger()
		logFile := getLogFilePath()

		os.Remove(logFile)

		logger.LogFinalStatus(10, 5, 5, 3, 0)

		content, _ := os.ReadFile(logFile)
		logContent := string(content)

		assert.Contains(t, logContent, "Active Bots: 3")
		assert.Contains(t, logContent, "Orders Completed: 10")
	})
}

func TestLoggerGetLogger(t *testing.T) {
	t.Run("should return logger instance", func(t *testing.T) {
		logger := mcdonald.GetLogger()

		assert.NotNil(t, logger)
	})
}
