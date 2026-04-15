package mcdonald

func (m *McDonald) SummaryResult() {
	for {
		if len(m.Bots) == 0 {
			break
		}
		wasProcessing := m.RemoveCookingBot()
		if wasProcessing {
			<-m.orderProcessed
		}
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	completed := len(m.CompleteOrder)
	pending := len(m.PendingOrder)
	activeBots := len(m.Bots)
	vipCount := 0
	normalCount := 0

	for _, order := range m.CompleteOrder {
		if order.Customer == VIPCustomer {
			vipCount++
		} else {
			normalCount++
		}
	}

	for _, order := range m.PendingOrder {
		if order.Customer == VIPCustomer {
			vipCount++
		} else {
			normalCount++
		}
	}

	logger := GetLogger()
	logger.LogFinalStatus(completed, vipCount, normalCount, activeBots, pending)
}
