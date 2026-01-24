package models

import "feedme-takehome/domain/entities"

type BotModel struct {
	ID             int
	IsProcessing   bool
	CurrentOrderID int
}

func (m *BotModel) ToEntity() *entities.Bot {
	return &entities.Bot{
		ID:             m.ID,
		IsProcessing:   m.IsProcessing,
		CurrentOrderID: m.CurrentOrderID,
	}
}

func BotModelFromEntity(bot *entities.Bot) *BotModel {
	return &BotModel{
		ID:             bot.ID,
		IsProcessing:   bot.IsProcessing,
		CurrentOrderID: bot.CurrentOrderID,
	}
}
