package interfaces

import "feedme-takehome/domain/entities"

type BotRepository interface {
	AddBot() (*entities.Bot, error)
	RemoveBot() error
	GetAllBots() []*entities.Bot
	GetIdleBots() []*entities.Bot
	UpdateBotStatus(botID int, isProcessing bool, orderID int) error
}
