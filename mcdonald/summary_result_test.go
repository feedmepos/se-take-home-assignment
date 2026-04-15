package mcdonald_test

import (
	"feedme/mcdonald"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSummaryResult(t *testing.T) {
	t.Run("should remove all bots and log final status with no orders", func(t *testing.T) {
		mcd := mcdonald.New()
		logFile := getLogFilePath()
		os.Remove(logFile)

		mcd.AddCookingBot()
		mcd.AddCookingBot()
		assert.Equal(t, 2, len(mcd.GetBots()))

		mcd.SummaryResult()

		assert.Equal(t, 0, len(mcd.GetBots()))

		content, _ := os.ReadFile(logFile)
		logContent := string(content)
		assert.Contains(t, logContent, "Final Status")
		assert.Contains(t, logContent, "Orders Completed: 0")
		assert.Contains(t, logContent, "Active Bots: 0")
		assert.Contains(t, logContent, "Pending Orders: 0")
	})

	t.Run("should count pending orders correctly", func(t *testing.T) {
		mcd := mcdonald.New()
		logFile := getLogFilePath()
		os.Remove(logFile)

		mcd.CreateOrder(mcdonald.NormalCustomer)
		mcd.CreateOrder(mcdonald.VIPCustomer)

		pendingOrders := mcd.GetPendingOrders()
		assert.Equal(t, 2, len(pendingOrders))

		mcd.SummaryResult()

		content, _ := os.ReadFile(logFile)
		logContent := string(content)
		assert.Contains(t, logContent, "Orders Completed: 0")
		assert.Contains(t, logContent, "Pending Orders: 2")
	})

	t.Run("should count VIP and normal customers in pending orders", func(t *testing.T) {
		mcd := mcdonald.New()
		logFile := getLogFilePath()
		os.Remove(logFile)

		// Add pending orders
		mcd.CreateOrder(mcdonald.VIPCustomer)
		mcd.CreateOrder(mcdonald.NormalCustomer)
		mcd.CreateOrder(mcdonald.NormalCustomer)

		pendingOrders := mcd.GetPendingOrders()
		assert.Equal(t, 3, len(pendingOrders))

		mcd.SummaryResult()

		content, _ := os.ReadFile(logFile)
		logContent := string(content)
		assert.Contains(t, logContent, "Total Orders Processed: 3 (1 VIP, 2 Normal)")
	})
}
