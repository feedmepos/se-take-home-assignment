package order

import "sync"

// BotPool manages active cooking bots (manager +Bot / -Bot).
// Thread-safe: all methods take p.mu internally.
type BotPool struct {
	mu   sync.Mutex
	bots []*Bot
}

func NewBotPool() *BotPool {
	return &BotPool{bots: make([]*Bot, 0)}
}

func (p *BotPool) Add(bot *Bot) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.bots = append(p.bots, bot)
}

// RemoveNewest destroys the newest bot (LIFO).
// If it was processing, the order is interrupted and returned for re-queue.
func (p *BotPool) RemoveNewest() (bot *Bot, interrupted *Order) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.bots) == 0 {
		return nil, nil
	}

	idx := len(p.bots) - 1
	bot = p.bots[idx]

	if bot.Status == Processing && bot.CurrentOrder != nil {
		select {
		case bot.stopChannel <- struct{}{}:
		default:
		}
		interrupted = bot.CurrentOrder
		interrupted.Status = StatusPending
		bot.CurrentOrder = nil
		bot.Status = Idle
	}

	p.bots = p.bots[:idx]
	return bot, interrupted
}

func (p *BotPool) Len() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.bots)
}

func (p *BotPool) IDs() []int {
	p.mu.Lock()
	defer p.mu.Unlock()
	ids := make([]int, len(p.bots))
	for i, b := range p.bots {
		ids[i] = b.ID
	}
	return ids
}

func (p *BotPool) State(bot *Bot) (BotStatus, *Order) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return bot.Status, bot.CurrentOrder
}

func (p *BotPool) OrderStatus(o *Order) string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return o.Status
}

func (p *BotPool) IsIdle(bot *Bot) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return bot.Status == Idle
}

// HasIdle reports whether any bot is free to take an order.
func (p *BotPool) HasIdle() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, b := range p.bots {
		if b.Status == Idle {
			return true
		}
	}
	return false
}

// AssignToIdle gives the order to one idle bot.
// Returns the bot, or nil if every bot is busy.
func (p *BotPool) AssignToIdle(order *Order) *Bot {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, b := range p.bots {
		if b.Status != Idle {
			continue
		}
		b.CurrentOrder = order
		b.Status = Processing
		order.Status = StatusProcessing
		return b
	}
	return nil
}

// Finish marks the order complete if this bot still owns it.
func (p *BotPool) Finish(bot *Bot, order *Order) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	if !p.containsLocked(bot.ID) || bot.CurrentOrder != order || order.Status != StatusProcessing {
		return false
	}
	order.Status = StatusComplete
	bot.CurrentOrder = nil
	bot.Status = Idle
	return true
}

// clearAfterStop clears the bot's current work after it was stopped mid-process.
func (p *BotPool) clearAfterStop(bot *Bot, order *Order) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if bot.CurrentOrder == order {
		bot.CurrentOrder = nil
		bot.Status = Idle
	}
}

func (p *BotPool) containsLocked(id int) bool {
	for _, b := range p.bots {
		if b.ID == id {
			return true
		}
	}
	return false
}
