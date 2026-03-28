package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestBot_Creation(t *testing.T) {
	bot := NewBot(1)

	assert.NotNil(t, bot)
	assert.Equal(t, uint64(1), bot.ID)
	assert.Equal(t, Idle, bot.Status)
	assert.Nil(t, bot.CurrentOrder)
	assert.True(t, bot.IsIdle())
	assert.False(t, bot.IsProcessing())
	assert.WithinDuration(t, time.Now(), bot.CreatedAt, time.Second)
}

func TestBot_StartProcessing(t *testing.T) {
	bot := NewBot(1)
	order := NewOrder(100, Normal)

	err := bot.StartProcessing(order)

	assert.NoError(t, err)
	assert.Equal(t, Processing, bot.Status)
	assert.Equal(t, order, bot.CurrentOrder)
	assert.True(t, bot.IsProcessing())
	assert.False(t, bot.IsIdle())
	assert.Equal(t, OrderProcessing, order.Status)
	assert.WithinDuration(t, time.Now(), bot.ProcessingStartTime, time.Second)
}

func TestBot_StartProcessing_WhenNotIdle(t *testing.T) {
	bot := NewBot(1)
	order1 := NewOrder(100, Normal)
	order2 := NewOrder(101, Normal)

	_ = bot.StartProcessing(order1)
	err := bot.StartProcessing(order2)

	assert.Error(t, err)
	assert.Equal(t, "bot is not idle", err.Error())
	assert.Equal(t, order1, bot.CurrentOrder)
}

func TestBot_StartProcessing_WithNilOrder(t *testing.T) {
	bot := NewBot(1)

	err := bot.StartProcessing(nil)

	assert.Error(t, err)
	assert.Equal(t, "order cannot be nil", err.Error())
	assert.True(t, bot.IsIdle())
}

func TestBot_CompleteProcessing(t *testing.T) {
	bot := NewBot(1)
	order := NewOrder(100, Normal)
	_ = bot.StartProcessing(order)

	completedOrder := bot.CompleteProcessing()

	assert.Equal(t, order, completedOrder)
	assert.Equal(t, OrderComplete, order.Status)
	assert.Equal(t, Idle, bot.Status)
	assert.Nil(t, bot.CurrentOrder)
	assert.True(t, bot.IsIdle())
	assert.False(t, bot.IsProcessing())
	assert.True(t, bot.ProcessingStartTime.IsZero())
}

func TestBot_CompleteProcessing_WhenNotProcessing(t *testing.T) {
	bot := NewBot(1)

	completedOrder := bot.CompleteProcessing()

	assert.Nil(t, completedOrder)
	assert.True(t, bot.IsIdle())
}

func TestBot_StopProcessing(t *testing.T) {
	bot := NewBot(1)
	order := NewOrder(100, Normal)
	_ = bot.StartProcessing(order)

	stoppedOrder := bot.StopProcessing()

	assert.Equal(t, order, stoppedOrder)
	assert.Equal(t, Idle, bot.Status)
	assert.Nil(t, bot.CurrentOrder)
	assert.True(t, bot.IsIdle())
	assert.False(t, bot.IsProcessing())
	assert.True(t, bot.ProcessingStartTime.IsZero())
}

func TestBot_StopProcessing_WhenNotProcessing(t *testing.T) {
	bot := NewBot(1)

	stoppedOrder := bot.StopProcessing()

	assert.Nil(t, stoppedOrder)
	assert.True(t, bot.IsIdle())
}

func TestBot_IsProcessing(t *testing.T) {
	bot := NewBot(1)

	assert.False(t, bot.IsProcessing())

	order := NewOrder(100, Normal)
	_ = bot.StartProcessing(order)

	assert.True(t, bot.IsProcessing())

	bot.CompleteProcessing()

	assert.False(t, bot.IsProcessing())
}

func TestBot_GetRemainingTime(t *testing.T) {
	bot := NewBot(1)
	order := NewOrder(100, Normal)

	_ = bot.StartProcessing(order)

	remaining := bot.GetRemainingTime()

	assert.Greater(t, remaining, time.Duration(0))
	assert.LessOrEqual(t, remaining, ProcessingTime)
}

func TestBot_GetRemainingTime_WhenIdle(t *testing.T) {
	bot := NewBot(1)

	remaining := bot.GetRemainingTime()

	assert.Equal(t, time.Duration(0), remaining)
}

func TestBot_GetRemainingTime_DecreasesOverTime(t *testing.T) {
	bot := NewBot(1)
	order := NewOrder(100, Normal)

	_ = bot.StartProcessing(order)

	remaining1 := bot.GetRemainingTime()
	time.Sleep(100 * time.Millisecond)
	remaining2 := bot.GetRemainingTime()

	assert.Greater(t, remaining1, remaining2)
}
