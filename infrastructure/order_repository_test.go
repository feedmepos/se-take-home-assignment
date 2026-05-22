package infrastructure

import (
	"testing"

	"mcdonalds-order-controller/domain"
	"github.com/stretchr/testify/assert"
)

func TestNewInMemoryOrderRepository(t *testing.T) {
	repo := NewInMemoryOrderRepository()
	assert.NotNil(t, repo)
	assert.NotNil(t, repo.orders)
	assert.Empty(t, repo.orders)
}

func TestInMemoryOrderRepository_Save(t *testing.T) {
	repo := NewInMemoryOrderRepository()

	t.Run("save nil order should return error", func(t *testing.T) {
		err := repo.Save(nil)
		assert.Error(t, err)
		assert.Equal(t, "order cannot be nil", err.Error())
	})

	t.Run("save valid order should succeed", func(t *testing.T) {
		order := domain.NewOrder(1, domain.Normal)
		err := repo.Save(order)
		assert.NoError(t, err)
		assert.Len(t, repo.orders, 1)
	})

	t.Run("save order with same ID should update", func(t *testing.T) {
		order := domain.NewOrder(2, domain.Normal)
		err := repo.Save(order)
		assert.NoError(t, err)

		order.Status = domain.OrderProcessing
		err = repo.Save(order)
		assert.NoError(t, err)

		found, _ := repo.FindByID(2)
		assert.Equal(t, domain.OrderProcessing, found.Status)
	})
}

func TestInMemoryOrderRepository_FindByID(t *testing.T) {
	repo := NewInMemoryOrderRepository()

	t.Run("find non-existent order should return error", func(t *testing.T) {
		order, err := repo.FindByID(999)
		assert.Error(t, err)
		assert.Equal(t, "order not found", err.Error())
		assert.Nil(t, order)
	})

	t.Run("find existing order should succeed", func(t *testing.T) {
		order := domain.NewOrder(1, domain.VIP)
		repo.Save(order)

		found, err := repo.FindByID(1)
		assert.NoError(t, err)
		assert.NotNil(t, found)
		assert.Equal(t, uint64(1), found.ID)
		assert.Equal(t, domain.VIP, found.Type)
	})
}

func TestInMemoryOrderRepository_FindAll(t *testing.T) {
	repo := NewInMemoryOrderRepository()

	t.Run("find all from empty repository should return empty slice", func(t *testing.T) {
		orders := repo.FindAll()
		assert.Empty(t, orders)
	})

	t.Run("find all should return all orders", func(t *testing.T) {
		order1 := domain.NewOrder(1, domain.Normal)
		order2 := domain.NewOrder(2, domain.VIP)
		repo.Save(order1)
		repo.Save(order2)

		orders := repo.FindAll()
		assert.Len(t, orders, 2)
	})
}

func TestInMemoryOrderRepository_FindByStatus(t *testing.T) {
	repo := NewInMemoryOrderRepository()

	t.Run("find by status with no matching orders should return empty slice", func(t *testing.T) {
		orders := repo.FindByStatus(domain.OrderComplete)
		assert.Empty(t, orders)
	})

	t.Run("find by status should return matching orders", func(t *testing.T) {
		order1 := domain.NewOrder(1, domain.Normal)
		order2 := domain.NewOrder(2, domain.VIP)
		order3 := domain.NewOrder(3, domain.Normal)

		order2.MarkProcessing()

		repo.Save(order1)
		repo.Save(order2)
		repo.Save(order3)

		pendingOrders := repo.FindByStatus(domain.OrderPending)
		assert.Len(t, pendingOrders, 2)

		processingOrders := repo.FindByStatus(domain.OrderProcessing)
		assert.Len(t, processingOrders, 1)
		assert.Equal(t, uint64(2), processingOrders[0].ID)
	})
}

func TestInMemoryOrderRepository_Update(t *testing.T) {
	repo := NewInMemoryOrderRepository()

	t.Run("update nil order should return error", func(t *testing.T) {
		err := repo.Update(nil)
		assert.Error(t, err)
		assert.Equal(t, "order cannot be nil", err.Error())
	})

	t.Run("update non-existent order should return error", func(t *testing.T) {
		order := domain.NewOrder(999, domain.Normal)
		err := repo.Update(order)
		assert.Error(t, err)
		assert.Equal(t, "order not found", err.Error())
	})

	t.Run("update existing order should succeed", func(t *testing.T) {
		order := domain.NewOrder(1, domain.Normal)
		repo.Save(order)

		order.Status = domain.OrderProcessing
		err := repo.Update(order)
		assert.NoError(t, err)

		updated, _ := repo.FindByID(1)
		assert.Equal(t, domain.OrderProcessing, updated.Status)
	})
}

func TestInMemoryOrderRepository_Concurrency(t *testing.T) {
	repo := NewInMemoryOrderRepository()

	t.Run("concurrent save operations should be safe", func(t *testing.T) {
		done := make(chan bool)

		for i := uint64(1); i <= 100; i++ {
			go func(id uint64) {
				order := domain.NewOrder(id, domain.Normal)
				repo.Save(order)
				done <- true
			}(i)
		}

		for i := 0; i < 100; i++ {
			<-done
		}

		assert.Len(t, repo.FindAll(), 100)
	})
}
