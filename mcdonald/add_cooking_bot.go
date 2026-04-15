package mcdonald

func (m *McDonald) AddCookingBot() {
	m.mu.Lock()
	defer m.mu.Unlock()

	bot := &Bot{
		ID:           m.nextBotID,
		IsProcessing: false,
		StopChannel:  make(chan bool, 1),
	}
	m.nextBotID++
	m.Bots = append(m.Bots, bot)

	logger := GetLogger()
	logger.LogBotCreated(bot.ID)

	m.assignOrderToIdleBot()
}
