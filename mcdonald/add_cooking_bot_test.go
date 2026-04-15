package mcdonald_test

import (
	"feedme/mcdonald"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAddCookingBot(t *testing.T) {
	t.Run("should create a single bot successfully", func(t *testing.T) {
		mcd := mcdonald.New()

		mcd.AddCookingBot()
		bots := mcd.GetBots()

		assert.Equal(t, 1, len(bots))
		assert.Equal(t, 1, bots[0].ID)
		assert.False(t, bots[0].IsProcessing)
	})

	t.Run("should create multiple bots with sequential IDs when add 3 bots", func(t *testing.T) {
		mcd := mcdonald.New()

		mcd.AddCookingBot()
		mcd.AddCookingBot()
		mcd.AddCookingBot()

		bots := mcd.GetBots()

		assert.Equal(t, 3, len(bots))
		assert.Equal(t, 1, bots[0].ID)
		assert.Equal(t, 2, bots[1].ID)
		assert.Equal(t, 3, bots[2].ID)
	})

	t.Run("should assign pending order to idle bot when add bot", func(t *testing.T) {
		mcd := mcdonald.New()
		mcd.CreateOrder(mcdonald.NormalCustomer)

		pendingBefore := mcd.GetPendingOrders()
		assert.Equal(t, 1, len(pendingBefore))

		mcd.AddCookingBot()

		pendingAfter := mcd.GetPendingOrders()
		assert.Equal(t, 0, len(pendingAfter))
	})

	t.Run("should assign pending orders to idle bots when add multiple bots", func(t *testing.T) {
		mcd := mcdonald.New()

		mcd.CreateOrder(mcdonald.NormalCustomer)
		mcd.CreateOrder(mcdonald.NormalCustomer)
		mcd.CreateOrder(mcdonald.NormalCustomer)

		mcd.AddCookingBot()
		mcd.AddCookingBot()

		pendingAfter := mcd.GetPendingOrders()
		assert.Equal(t, 1, len(pendingAfter))

		bots := mcd.GetBots()
		assert.True(t, bots[0].IsProcessing)
		assert.True(t, bots[1].IsProcessing)
	})
}
