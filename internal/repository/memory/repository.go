package memory

import "github.com/feedme/se-take-home-assignment/internal/domain"

// OrderRepository DESIGN 4.2 契约；由 Memory 实现。
type OrderRepository interface {
	NextOrderID() domain.OrderID
	SaveOrder(o *domain.Order)
	GetOrder(id domain.OrderID) (*domain.Order, error)
	EnqueuePending(tier domain.Tier, id domain.OrderID) error
	DequeueNext() (id domain.OrderID, tier domain.Tier, ok bool)
	AssignNextToBot(botID domain.BotID) (*domain.Order, bool)
	RequeueToPending(id domain.OrderID, tier domain.Tier, indexInTier int) error
	ListByStatus(status domain.OrderStatus) []*domain.Order
}

var _ OrderRepository = (*Memory)(nil)
