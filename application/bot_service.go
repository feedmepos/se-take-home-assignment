package application

import (
	"mcdonalds-order-controller/domain"
)

type BotService struct {
	scheduler *domain.BotScheduler
}

func NewBotService(scheduler *domain.BotScheduler) *BotService {
	return &BotService{
		scheduler: scheduler,
	}
}

func (s *BotService) AddBot() *domain.Bot {
	return s.scheduler.AddBot()
}

func (s *BotService) RemoveBot() (*domain.Bot, *domain.Order) {
	return s.scheduler.RemoveBot()
}

func (s *BotService) GetBotStatus() map[uint64]string {
	return s.scheduler.GetBotStatus()
}
