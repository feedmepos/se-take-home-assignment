package mcdonald_test

import (
	"feedme/mcdonald"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateOrder(t *testing.T) {
	t.Run("should create a normal order successfully", func(t *testing.T) {
		mcd := mcdonald.New()

		order := mcd.CreateOrder(mcdonald.NormalCustomer)

		assert.NotNil(t, order)
		assert.Equal(t, 1, order.ID)
		assert.Equal(t, mcdonald.NormalCustomer, order.Customer)
		assert.Equal(t, mcdonald.StatusPending, order.Status)
	})

	t.Run("should create a VIP order successfully", func(t *testing.T) {
		mcd := mcdonald.New()

		order := mcd.CreateOrder(mcdonald.VIPCustomer)

		assert.NotNil(t, order)
		assert.Equal(t, 1, order.ID)
		assert.Equal(t, mcdonald.VIPCustomer, order.Customer)
		assert.Equal(t, mcdonald.StatusPending, order.Status)
	})

	t.Run("should increment order ID for each new order", func(t *testing.T) {
		mcd := mcdonald.New()

		order1 := mcd.CreateOrder(mcdonald.NormalCustomer)
		order2 := mcd.CreateOrder(mcdonald.NormalCustomer)
		order3 := mcd.CreateOrder(mcdonald.VIPCustomer)
		order4 := mcd.CreateOrder(mcdonald.NormalCustomer)

		assert.Equal(t, 1, order1.ID)
		assert.Equal(t, 2, order2.ID)
		assert.Equal(t, 3, order3.ID)
		assert.Equal(t, 4, order4.ID)
	})

	t.Run("should add VIP order to pending queue before first normal order", func(t *testing.T) {
		mcd := mcdonald.New()

		order1 := mcd.CreateOrder(mcdonald.NormalCustomer)
		order2 := mcd.CreateOrder(mcdonald.NormalCustomer)
		order3 := mcd.CreateOrder(mcdonald.VIPCustomer)

		pending := mcd.GetPendingOrders()
		assert.Equal(t, 3, len(pending))
		assert.Equal(t, order3.ID, pending[0].ID)
		assert.Equal(t, order1.ID, pending[1].ID)
		assert.Equal(t, order2.ID, pending[2].ID)
	})

	t.Run("should add VIP order in order of creation when multiple VIP orders are created", func(t *testing.T) {
		mcd := mcdonald.New()

		order1 := mcd.CreateOrder(mcdonald.VIPCustomer)
		order2 := mcd.CreateOrder(mcdonald.NormalCustomer)
		order3 := mcd.CreateOrder(mcdonald.VIPCustomer)

		pending := mcd.GetPendingOrders()
		assert.Equal(t, 3, len(pending))
		assert.Equal(t, order1.ID, pending[0].ID)
		assert.Equal(t, order3.ID, pending[1].ID)
		assert.Equal(t, order2.ID, pending[2].ID)
	})
}
