package mcdonald_test

import (
	"feedme/mcdonald"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestRemoveCookingBot(t *testing.T) {
	t.Run("should remove a bot when bots exist", func(t *testing.T) {
		mcd := mcdonald.New()

		mcd.AddCookingBot()
		assert.Equal(t, 1, len(mcd.GetBots()))

		mcd.RemoveCookingBot()
		assert.Zero(t, len(mcd.GetBots()))
	})

	t.Run("should nothing happens when trying to remove a bot when no bots exist", func(t *testing.T) {
		mcd := mcdonald.New()

		mcd.RemoveCookingBot()

		assert.Zero(t, len(mcd.GetBots()))
	})

	t.Run("should remove the newest (last) bot", func(t *testing.T) {
		mcd := mcdonald.New()

		mcd.AddCookingBot()
		mcd.AddCookingBot()
		mcd.AddCookingBot()

		mcd.RemoveCookingBot()

		botsAfter := mcd.GetBots()
		assert.Equal(t, 2, len(botsAfter))
		assert.Equal(t, 1, botsAfter[0].ID)
		assert.Equal(t, 2, botsAfter[1].ID)
	})

	t.Run("should remove idle bot successfully", func(t *testing.T) {
		mcd := mcdonald.New()

		mcd.AddCookingBot()
		bots := mcd.GetBots()
		assert.False(t, bots[0].IsProcessing)

		mcd.RemoveCookingBot()
		assert.Equal(t, 0, len(mcd.GetBots()))
	})

	t.Run("should stop and return order when removing processing bot", func(t *testing.T) {
		mcd := mcdonald.New()
		order1 := mcd.CreateOrder(mcdonald.NormalCustomer)

		mcd.AddCookingBot()

		mcd.RemoveCookingBot()

		// NOTE: wait for a bit to ensure the goroutine has processed the StopChannel signal and returned the order to pending order
		time.Sleep(50 * time.Millisecond)

		assert.Equal(t, 0, len(mcd.GetBots()))
		pendingAfter := mcd.GetPendingOrders()
		assert.Equal(t, 1, len(pendingAfter))
		assert.Equal(t, order1.ID, pendingAfter[0].ID)
		assert.Equal(t, mcdonald.StatusPending, pendingAfter[0].Status)
	})

	t.Run("should order back to original position when removing processing bot", func(t *testing.T) {
		mcd := mcdonald.New()

		order1 := mcd.CreateOrder(mcdonald.NormalCustomer)
		order2 := mcd.CreateOrder(mcdonald.NormalCustomer)
		order3 := mcd.CreateOrder(mcdonald.VIPCustomer)

		mcd.AddCookingBot()
		mcd.RemoveCookingBot()

		// NOTE: wait for a bit to ensure the goroutine has processed the StopChannel signal and returned the order to pending order
		time.Sleep(50 * time.Millisecond)

		pendingAfter := mcd.GetPendingOrders()
		assert.Equal(t, 3, len(pendingAfter))
		assert.Equal(t, order3.ID, pendingAfter[0].ID, "First pending order should be the returned VIP order")
		assert.Equal(t, order1.ID, pendingAfter[1].ID)
		assert.Equal(t, order2.ID, pendingAfter[2].ID)
	})
}
