package infrastructure

import (
	"errors"
	"sync"

	"mcdonalds-order-controller/domain"
)

type BotRepository interface {
	Save(bot *domain.Bot) error
	FindByID(id uint64) (*domain.Bot, error)
	FindAll() []*domain.Bot
	FindByStatus(status domain.BotStatus) []*domain.Bot
	Delete(id uint64) error
}

type InMemoryBotRepository struct {
	bots map[uint64]*domain.Bot
	mu   sync.RWMutex
}

func NewInMemoryBotRepository() *InMemoryBotRepository {
	return &InMemoryBotRepository{
		bots: make(map[uint64]*domain.Bot),
	}
}

func (r *InMemoryBotRepository) Save(bot *domain.Bot) error {
	if bot == nil {
		return errors.New("bot cannot be nil")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.bots[bot.ID] = bot
	return nil
}

func (r *InMemoryBotRepository) FindByID(id uint64) (*domain.Bot, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	bot, exists := r.bots[id]
	if !exists {
		return nil, errors.New("bot not found")
	}

	return bot, nil
}

func (r *InMemoryBotRepository) FindAll() []*domain.Bot {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Bot, 0, len(r.bots))
	for _, bot := range r.bots {
		result = append(result, bot)
	}

	return result
}

func (r *InMemoryBotRepository) FindByStatus(status domain.BotStatus) []*domain.Bot {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Bot, 0)
	for _, bot := range r.bots {
		if bot.Status == status {
			result = append(result, bot)
		}
	}

	return result
}

func (r *InMemoryBotRepository) Delete(id uint64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.bots[id]; !exists {
		return errors.New("bot not found")
	}

	delete(r.bots, id)
	return nil
}
