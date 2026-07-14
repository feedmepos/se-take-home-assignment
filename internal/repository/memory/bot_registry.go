package memory

import (
	"sync"

	"feedme-order-controller/internal/repository/entity"
	"feedme-order-controller/internal/usecase/core"
	"feedme-order-controller/pkg/idgen"
)

// BotRegistry is an in-memory, thread-safe registry of live bots.
type BotRegistry struct {
	mu   sync.Mutex
	seq  *idgen.Sequence
	bots []entity.BotEntity
}

// NewBotRegistry creates an empty BotRegistry with its ID sequence starting
// at 1.
func NewBotRegistry() *BotRegistry {
	return &BotRegistry{
		seq: idgen.NewSequence(1),
	}
}

// NextBotID returns the next strictly-increasing bot ID.
func (r *BotRegistry) NextBotID() int {
	return r.seq.Next()
}

// Add registers bot b in the registry.
func (r *BotRegistry) Add(b *core.Bot) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.bots = append(r.bots, entity.BotEntity{ID: b.ID, Ref: b})
}

// RemoveNewest removes and returns the most recently added bot (LIFO). ok is
// false if the registry is empty.
func (r *BotRegistry) RemoveNewest() (*core.Bot, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	n := len(r.bots)
	if n == 0 {
		return nil, false
	}
	e := r.bots[n-1]
	r.bots = r.bots[:n-1]
	return e.Ref.(*core.Bot), true
}

// List returns a copy of the registered bots in insertion order.
func (r *BotRegistry) List() []*core.Bot {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*core.Bot, 0, len(r.bots))
	for _, e := range r.bots {
		out = append(out, e.Ref.(*core.Bot))
	}
	return out
}

// Count returns the number of registered bots.
func (r *BotRegistry) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.bots)
}
