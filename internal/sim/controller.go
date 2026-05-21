package sim

import (
	"time"

	"github.com/rs/zerolog/log"
)

type Order struct {
	ID     int
	IsVIP  bool
	Status string
}

type Bot struct {
	ID      int
	Current *Order
	BusyEnd time.Time
}

type Controller struct {
	now         time.Time
	timeStep    time.Duration
	processTime time.Duration
	nextOrderID int
	nextBotID   int

	pending  []Order
	complete []Order
	bots     []Bot
	logs     []string
}

func NewController(startID int) *Controller {
	return &Controller{
		pending:     []Order{},
		complete:    []Order{},
		bots:        []Bot{},
		nextOrderID: startID,
		nextBotID:   1,
		now:         time.Now(),
		processTime: 10 * time.Second,
		timeStep:    1 * time.Second,
	}
}

func (c *Controller) Now() time.Time {
	return c.now
}

func (c *Controller) CreateNormalOrder() Order {
	order := Order{
		ID:     c.nextOrderID,
		IsVIP:  false,
		Status: "PENDING",
	}
	c.nextOrderID++
	c.pending = append(c.pending, order)
	log.Info().Msgf("Created %s Order #%d - Status: %s", order.OrderType(), order.ID, order.Status)

	return order
}

func (c *Controller) CreateVIPOrder() Order {
	order := Order{
		ID:     c.nextOrderID,
		IsVIP:  true,
		Status: "PENDING",
	}
	// increment nextOrderId
	c.nextOrderID++

	i := 0
	for i < len(c.pending) && c.pending[i].IsVIP {
		i++
	}

	// append order to pending
	c.pending = append(c.pending, Order{})

	// shift right
	copy(c.pending[i+1:], c.pending[i:])
	c.pending[i] = order //place vip

	log.Info().Msgf("Created %s Order #%d - Status: %s", order.OrderType(), order.ID, order.Status)
	return order
}

// add small getter (for testing)
func (c *Controller) PendingOrders() []Order {
	out := make([]Order, len(c.pending))
	copy(out, c.pending)
	return out
}

func (c *Controller) NextOrderID() int {
	return c.nextOrderID
}

func (c *Controller) CompleteOrder() []Order {
	out := make([]Order, len(c.complete))
	copy(out, c.complete)
	return out
}

func (o Order) OrderType() string {
	if o.IsVIP {
		return "VIP"
	}
	return "Normal"
}

func (c *Controller) Bots() []Bot {
	return c.bots
}
