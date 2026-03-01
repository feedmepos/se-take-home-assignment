package repositories

import (
	"feedme-takehome/data/models"
	"feedme-takehome/domain/entities"
	"feedme-takehome/domain/interfaces"
	"sync"
)

type InMemoryBotRepository struct {
	bots      []*models.BotModel
	nextBotID int
	mu        sync.RWMutex
}

func NewInMemoryBotRepository() interfaces.BotRepository {
	return &InMemoryBotRepository{
		bots:      make([]*models.BotModel, 0),
		nextBotID: 1,
	}
}

func (r *InMemoryBotRepository) AddBot() (*entities.Bot, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	botModel := &models.BotModel{
		ID:             r.nextBotID,
		IsProcessing:   false,
		CurrentOrderID: 0,
	}

	r.nextBotID++
	r.bots = append(r.bots, botModel)

	return botModel.ToEntity(), nil
}

func (r *InMemoryBotRepository) RemoveBot() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.bots) == 0 {
		return nil
	}

	newestIndex := 0
	for i, bot := range r.bots {
		if bot.ID > r.bots[newestIndex].ID {
			newestIndex = i
		}
	}

	r.bots = append(r.bots[:newestIndex], r.bots[newestIndex+1:]...)

	return nil
}

func (r *InMemoryBotRepository) GetAllBots() []*entities.Bot {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*entities.Bot, 0, len(r.bots))
	for _, botModel := range r.bots {
		result = append(result, botModel.ToEntity())
	}
	return result
}

func (r *InMemoryBotRepository) GetIdleBots() []*entities.Bot {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var idle []*entities.Bot
	for _, botModel := range r.bots {
		if !botModel.IsProcessing {
			idle = append(idle, botModel.ToEntity())
		}
	}

	return idle
}

func (r *InMemoryBotRepository) UpdateBotStatus(botID int, isProcessing bool, orderID int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, botModel := range r.bots {
		if botModel.ID == botID {
			botModel.IsProcessing = isProcessing
			botModel.CurrentOrderID = orderID
			return nil
		}
	}

	return nil
}
