package infrastructure

import (
	"testing"

	"mcdonalds-order-controller/domain"
	"github.com/stretchr/testify/assert"
)

func TestNewInMemoryBotRepository(t *testing.T) {
	repo := NewInMemoryBotRepository()
	assert.NotNil(t, repo)
	assert.NotNil(t, repo.bots)
	assert.Empty(t, repo.bots)
}

func TestInMemoryBotRepository_Save(t *testing.T) {
	repo := NewInMemoryBotRepository()

	t.Run("save nil bot should return error", func(t *testing.T) {
		err := repo.Save(nil)
		assert.Error(t, err)
		assert.Equal(t, "bot cannot be nil", err.Error())
	})

	t.Run("save valid bot should succeed", func(t *testing.T) {
		bot := domain.NewBot(1)
		err := repo.Save(bot)
		assert.NoError(t, err)
		assert.Len(t, repo.bots, 1)
	})

	t.Run("save bot with same ID should update", func(t *testing.T) {
		bot := domain.NewBot(2)
		err := repo.Save(bot)
		assert.NoError(t, err)

		bot.Status = domain.Processing
		err = repo.Save(bot)
		assert.NoError(t, err)

		found, _ := repo.FindByID(2)
		assert.Equal(t, domain.Processing, found.Status)
	})
}

func TestInMemoryBotRepository_FindByID(t *testing.T) {
	repo := NewInMemoryBotRepository()

	t.Run("find non-existent bot should return error", func(t *testing.T) {
		bot, err := repo.FindByID(999)
		assert.Error(t, err)
		assert.Equal(t, "bot not found", err.Error())
		assert.Nil(t, bot)
	})

	t.Run("find existing bot should succeed", func(t *testing.T) {
		bot := domain.NewBot(1)
		repo.Save(bot)

		found, err := repo.FindByID(1)
		assert.NoError(t, err)
		assert.NotNil(t, found)
		assert.Equal(t, uint64(1), found.ID)
		assert.Equal(t, domain.Idle, found.Status)
	})
}

func TestInMemoryBotRepository_FindAll(t *testing.T) {
	repo := NewInMemoryBotRepository()

	t.Run("find all from empty repository should return empty slice", func(t *testing.T) {
		bots := repo.FindAll()
		assert.Empty(t, bots)
	})

	t.Run("find all should return all bots", func(t *testing.T) {
		bot1 := domain.NewBot(1)
		bot2 := domain.NewBot(2)
		repo.Save(bot1)
		repo.Save(bot2)

		bots := repo.FindAll()
		assert.Len(t, bots, 2)
	})
}

func TestInMemoryBotRepository_FindByStatus(t *testing.T) {
	repo := NewInMemoryBotRepository()

	t.Run("find by status with no matching bots should return empty slice", func(t *testing.T) {
		bots := repo.FindByStatus(domain.Processing)
		assert.Empty(t, bots)
	})

	t.Run("find by status should return matching bots", func(t *testing.T) {
		bot1 := domain.NewBot(1)
		bot2 := domain.NewBot(2)
		bot3 := domain.NewBot(3)

		order := domain.NewOrder(1, domain.Normal)
		bot2.StartProcessing(order)

		repo.Save(bot1)
		repo.Save(bot2)
		repo.Save(bot3)

		idleBots := repo.FindByStatus(domain.Idle)
		assert.Len(t, idleBots, 2)

		processingBots := repo.FindByStatus(domain.Processing)
		assert.Len(t, processingBots, 1)
		assert.Equal(t, uint64(2), processingBots[0].ID)
	})
}

func TestInMemoryBotRepository_Delete(t *testing.T) {
	repo := NewInMemoryBotRepository()

	t.Run("delete non-existent bot should return error", func(t *testing.T) {
		err := repo.Delete(999)
		assert.Error(t, err)
		assert.Equal(t, "bot not found", err.Error())
	})

	t.Run("delete existing bot should succeed", func(t *testing.T) {
		bot := domain.NewBot(1)
		repo.Save(bot)
		assert.Len(t, repo.bots, 1)

		err := repo.Delete(1)
		assert.NoError(t, err)
		assert.Empty(t, repo.bots)
	})

	t.Run("verify deleted bot cannot be found", func(t *testing.T) {
		bot := domain.NewBot(1)
		repo.Save(bot)

		err := repo.Delete(1)
		assert.NoError(t, err)

		_, err = repo.FindByID(1)
		assert.Error(t, err)
	})
}

func TestInMemoryBotRepository_Concurrency(t *testing.T) {
	repo := NewInMemoryBotRepository()

	t.Run("concurrent save operations should be safe", func(t *testing.T) {
		done := make(chan bool)

		for i := uint64(1); i <= 100; i++ {
			go func(id uint64) {
				bot := domain.NewBot(id)
				repo.Save(bot)
				done <- true
			}(i)
		}

		for i := 0; i < 100; i++ {
			<-done
		}

		assert.Len(t, repo.FindAll(), 100)
	})

	t.Run("concurrent delete operations should be safe", func(t *testing.T) {
		repo := NewInMemoryBotRepository()

		for i := uint64(1); i <= 50; i++ {
			bot := domain.NewBot(i)
			repo.Save(bot)
		}

		done := make(chan bool)

		for i := uint64(1); i <= 50; i++ {
			go func(id uint64) {
				repo.Delete(id)
				done <- true
			}(i)
		}

		for i := 0; i < 50; i++ {
			<-done
		}

		assert.Empty(t, repo.FindAll())
	})
}
