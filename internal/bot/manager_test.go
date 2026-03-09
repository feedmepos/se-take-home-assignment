package bot

import (
	"sync"
	"testing"
	"time"

	"github.com/hwakman/se-take-home-assignment/internal/domain"
	"github.com/hwakman/se-take-home-assignment/internal/queue"
	"github.com/stretchr/testify/assert"
)

func TestBotManager_AddRemoveBot(t *testing.T) {
	q := queue.NewOrderQueue()
	var mu sync.Mutex
	completed := make([]int, 0)
	
	m := NewBotManager(q, 
		func(o *domain.Order) {
			mu.Lock()
			completed = append(completed, o.ID)
			mu.Unlock()
		},
		func(o *domain.Order) {},
		func(o *domain.Order, id int) {},
	)

	m.SetBotCount(2)
	assert.Equal(t, 2, m.BotCount())

	m.SetBotCount(1)
	assert.Equal(t, 1, m.BotCount())

	m.SetBotCount(0)
	assert.Equal(t, 0, m.BotCount())
	
	m.SetBotCount(-1)
	assert.Equal(t, 0, m.BotCount())

	m.SetBotCount(101)
	assert.Equal(t, 100, m.BotCount())
}

func TestBotManager_ProcessOrder(t *testing.T) {
	// Use a shorter processing time for tests by mocking if possible, 
	// but here we just wait if needed or test the flow.
	// Since 10s is hardcoded, we might want to refactor to allow shorter time in tests.
	// For now, let's keep it and maybe test a "cancelled" scenario.
	
	q := queue.NewOrderQueue()
	backToQueue := make(chan int, 1)
	completed := make(chan int, 1)
	m := NewBotManager(q, 
		func(o *domain.Order) {
			completed <- o.ID
		},
		func(o *domain.Order) {
			backToQueue <- o.ID
		},
		func(o *domain.Order, id int) {},
	)
	m.ProcessDuration = 50 * time.Millisecond

	m.SetBotCount(1)
	order := &domain.Order{ID: 1, OrderType: domain.OrderTypeNormal}
	q.Push(order)

	// Test completion
	select {
	case id := <-completed:
		assert.Equal(t, 1, id)
	case <-time.After(2 * time.Second):
		t.Fatal("Order was not completed")
	}

	// Test cancellation/back to queue
	order2 := &domain.Order{ID: 2, OrderType: domain.OrderTypeNormal}
	q.Push(order2)
	
	// Wait specifically for status to change to Processing
	found := false
	for i := 0; i < 20; i++ {
		bots := m.GetBots()
		if len(bots) > 0 && bots[0].Status == domain.BotStatusProcessing {
			found = true
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	assert.True(t, found, "Bot should have started processing order 2")

	m.SetBotCount(0)
	
	select {
	case id := <-backToQueue:
		assert.Equal(t, 2, id)
	case <-time.After(2 * time.Second):
		t.Fatal("Order was not returned to queue after bot removal")
	}
}

func TestBotManager_GetBots(t *testing.T) {
	q := queue.NewOrderQueue()
	m := NewBotManager(q, func(o *domain.Order) {}, func(o *domain.Order) {}, func(o *domain.Order, id int) {})
	m.SetBotCount(1)
	
	bots := m.GetBots()
	assert.Equal(t, 1, len(bots))
	assert.Equal(t, 1, bots[0].ID)
}
