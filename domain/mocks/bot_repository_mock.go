package mocks

import "feedme-takehome/domain/entities"

type MockBotRepository struct {
	// Return values for each method
	AddBotFunc          func() (*entities.Bot, error)
	RemoveBotFunc       func() error
	GetAllBotsFunc      func() []*entities.Bot
	GetIdleBotsFunc     func() []*entities.Bot
	UpdateBotStatusFunc func(botID int, isProcessing bool, orderID int) error

	// Call tracking
	AddBotCalls          int
	RemoveBotCalls       int
	GetAllBotsCalls      int
	GetIdleBotsCalls     int
	UpdateBotStatusCalls []UpdateBotStatusCall
}

type UpdateBotStatusCall struct {
	BotID        int
	IsProcessing bool
	OrderID      int
}

func NewMockBotRepository() *MockBotRepository {
	return &MockBotRepository{
		UpdateBotStatusCalls: []UpdateBotStatusCall{},
	}
}

func (m *MockBotRepository) AddBot() (*entities.Bot, error) {
	m.AddBotCalls++
	if m.AddBotFunc != nil {
		return m.AddBotFunc()
	}
	return &entities.Bot{
		ID:             m.AddBotCalls,
		IsProcessing:   false,
		CurrentOrderID: 0,
	}, nil
}

func (m *MockBotRepository) RemoveBot() error {
	m.RemoveBotCalls++
	if m.RemoveBotFunc != nil {
		return m.RemoveBotFunc()
	}
	return nil
}

func (m *MockBotRepository) GetAllBots() []*entities.Bot {
	m.GetAllBotsCalls++
	if m.GetAllBotsFunc != nil {
		return m.GetAllBotsFunc()
	}
	return []*entities.Bot{}
}

func (m *MockBotRepository) GetIdleBots() []*entities.Bot {
	m.GetIdleBotsCalls++
	if m.GetIdleBotsFunc != nil {
		return m.GetIdleBotsFunc()
	}
	return []*entities.Bot{}
}

func (m *MockBotRepository) UpdateBotStatus(botID int, isProcessing bool, orderID int) error {
	m.UpdateBotStatusCalls = append(m.UpdateBotStatusCalls, UpdateBotStatusCall{
		BotID:        botID,
		IsProcessing: isProcessing,
		OrderID:      orderID,
	})
	if m.UpdateBotStatusFunc != nil {
		return m.UpdateBotStatusFunc(botID, isProcessing, orderID)
	}
	return nil
}

func (m *MockBotRepository) Reset() {
	m.AddBotCalls = 0
	m.RemoveBotCalls = 0
	m.GetAllBotsCalls = 0
	m.GetIdleBotsCalls = 0
	m.UpdateBotStatusCalls = []UpdateBotStatusCall{}
}
