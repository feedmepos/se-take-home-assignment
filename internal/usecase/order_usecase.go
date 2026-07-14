package usecase

import (
	"errors"
	"sync"
	"time"

	"feedme-order-controller/internal/core"
)

// ErrNoBots is returned by RemoveBot when there are no bots to remove.
var ErrNoBots = errors.New("no bots to remove")

// Usecase implements the order-controller application logic: creating
// orders, reporting status, and managing the lifecycle of processing bots.
// It is safe for concurrent use.
type Usecase struct {
	orders OrderRepository
	bots   BotRepository
	clock  Clock
	logger Logger

	processingTime time.Duration

	wg sync.WaitGroup
}

// New constructs a Usecase. clock is stored for future use (e.g.
// timestamping domain events) but is not currently consulted by any method
// below.
func New(orders OrderRepository, bots BotRepository, clock Clock, logger Logger, processingTime time.Duration) *Usecase {
	return &Usecase{
		orders:         orders,
		bots:           bots,
		clock:          clock,
		logger:         logger,
		processingTime: processingTime,
	}
}

// NewNormalOrder creates a new Normal-priority order, enqueues it, and
// returns it.
func (u *Usecase) NewNormalOrder() core.Order {
	return u.newOrder(core.Normal)
}

// NewVIPOrder creates a new VIP-priority order, enqueues it, and returns it.
func (u *Usecase) NewVIPOrder() core.Order {
	return u.newOrder(core.VIP)
}

func (u *Usecase) newOrder(kind core.OrderKind) core.Order {
	o := core.Order{
		ID:     u.orders.NextOrderID(),
		Kind:   kind,
		Status: core.Pending,
	}
	u.orders.Enqueue(o)
	u.logger.Logf("Created %s Order #%d - Status: PENDING", o.Kind, o.ID)
	return o
}

// Status returns a point-in-time snapshot of the whole system: bots,
// pending orders, and completion counters.
func (u *Usecase) Status() core.Summary {
	pending := u.orders.PendingSnapshot()
	completed, vip, normal := u.orders.CompletedCounts()
	bots := u.bots.List()

	summary := core.Summary{
		ActiveBots:      len(bots),
		PendingOrders:   len(pending),
		CompletedOrders: completed,
		VIPCompleted:    vip,
		NormalCompleted: normal,
		Pending:         pending,
		Bots:            make([]core.BotSnapshot, 0, len(bots)),
	}

	for _, b := range bots {
		snap := core.BotSnapshot{
			ID:     b.ID,
			Status: b.Status(),
		}
		if cur := b.Current(); cur != nil {
			snap.ProcessingOrderID = cur.ID
		}
		summary.Bots = append(summary.Bots, snap)
	}

	return summary
}
