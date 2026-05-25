// ABOUTME: Coordinates order state and cooking bot assignment for the CLI prototype.
// ABOUTME: Provides deterministic methods that can be tested without terminal I/O.
package orders

import "time"

const ProcessingDuration = 10 * time.Second

type OrderType string

const (
	NormalOrder OrderType = "Normal"
	VIPOrder    OrderType = "VIP"
)

type OrderStatus string

const (
	Pending    OrderStatus = "PENDING"
	Processing OrderStatus = "PROCESSING"
	Complete   OrderStatus = "COMPLETE"
)

type Order struct {
	ID          int
	Type        OrderType
	Status      OrderStatus
	CreatedAt   time.Time
	PickedUpAt  time.Time
	CompletedAt time.Time
}

type BotStatus string

const (
	BotIdle       BotStatus = "IDLE"
	BotProcessing BotStatus = "PROCESSING"
)

type Bot struct {
	ID           int
	Status       BotStatus
	CurrentOrder *Order
}

type Snapshot struct {
	PendingOrders   []Order
	CompletedOrders []Order
	Bots            []Bot
}

type OrderController struct {
	nextOrderID int
	nextBotID   int
	pending     []Order
	completed   []Order
	bots        []Bot
}

func NewController() *OrderController {
	return &OrderController{nextOrderID: 1, nextBotID: 1}
}

func (controller *OrderController) AddOrder(orderType OrderType, at time.Time) []Event {
	order := Order{
		ID:        controller.nextOrderID,
		Type:      orderType,
		Status:    Pending,
		CreatedAt: at,
	}
	controller.nextOrderID++
	controller.queuePendingOrder(order)
	controller.assignPendingOrders(at)

	return nil
}

func (controller *OrderController) AddBot(at time.Time) []Event {
	bot := Bot{
		ID:     controller.nextBotID,
		Status: BotIdle,
	}
	controller.nextBotID++
	controller.bots = append(controller.bots, bot)

	controller.assignPendingOrders(at)
	return nil
}

func (controller *OrderController) AdvanceTo(at time.Time) []Event {
	for {
		botIndex, completedAt, ok := controller.nextCompletedBot(at)
		if !ok {
			break
		}
		controller.completeBotOrder(botIndex, completedAt)
		controller.assignPendingOrders(completedAt)
	}

	return nil
}

func (controller *OrderController) RemoveNewestBot(_ time.Time) []Event {
	if len(controller.bots) == 0 {
		return nil
	}

	lastIndex := len(controller.bots) - 1
	removedBot := controller.bots[lastIndex]
	controller.bots = controller.bots[:lastIndex]

	if removedBot.CurrentOrder != nil {
		order := *removedBot.CurrentOrder
		order.Status = Pending
		order.PickedUpAt = time.Time{}
		order.CompletedAt = time.Time{}
		controller.queuePendingOrder(order)
	}

	return nil
}

func (controller *OrderController) nextCompletedBot(at time.Time) (int, time.Time, bool) {
	nextBotIndex := -1
	var nextCompletedAt time.Time

	for index, bot := range controller.bots {
		if bot.Status != BotProcessing || bot.CurrentOrder == nil {
			continue
		}

		completedAt := bot.CurrentOrder.PickedUpAt.Add(ProcessingDuration)
		if completedAt.After(at) {
			continue
		}

		if nextBotIndex == -1 || completedAt.Before(nextCompletedAt) || completedAt.Equal(nextCompletedAt) && bot.ID < controller.bots[nextBotIndex].ID {
			nextBotIndex = index
			nextCompletedAt = completedAt
		}
	}

	if nextBotIndex == -1 {
		return 0, time.Time{}, false
	}
	return nextBotIndex, nextCompletedAt, true
}

func (controller *OrderController) completeBotOrder(botIndex int, completedAt time.Time) {
	bot := &controller.bots[botIndex]
	order := *bot.CurrentOrder
	order.Status = Complete
	order.CompletedAt = completedAt
	controller.completed = append(controller.completed, order)
	bot.Status = BotIdle
	bot.CurrentOrder = nil
}

func (controller *OrderController) assignPendingOrders(at time.Time) {
	for index := range controller.bots {
		if len(controller.pending) == 0 {
			return
		}
		if controller.bots[index].Status == BotIdle {
			controller.assignPendingOrder(&controller.bots[index], at)
		}
	}
}

func (controller *OrderController) assignPendingOrder(bot *Bot, at time.Time) {
	order := controller.pending[0]
	controller.pending = controller.pending[1:]
	order.Status = Processing
	order.PickedUpAt = at
	bot.Status = BotProcessing
	bot.CurrentOrder = &order
}

func (controller *OrderController) queuePendingOrder(order Order) {
	insertAt := len(controller.pending)
	for index, pendingOrder := range controller.pending {
		if comesBefore(order, pendingOrder) {
			insertAt = index
			break
		}
	}

	controller.pending = append(controller.pending, Order{})
	copy(controller.pending[insertAt+1:], controller.pending[insertAt:])
	controller.pending[insertAt] = order
}

func comesBefore(candidate Order, current Order) bool {
	if candidate.Type == VIPOrder && current.Type == NormalOrder {
		return true
	}
	if candidate.Type != current.Type {
		return false
	}
	if candidate.CreatedAt.Equal(current.CreatedAt) {
		return candidate.ID < current.ID
	}
	return candidate.CreatedAt.Before(current.CreatedAt)
}

func (controller *OrderController) Snapshot() Snapshot {
	pending := make([]Order, len(controller.pending))
	copy(pending, controller.pending)
	completed := make([]Order, len(controller.completed))
	copy(completed, controller.completed)
	bots := make([]Bot, len(controller.bots))
	for index, bot := range controller.bots {
		bots[index] = bot
		if bot.CurrentOrder != nil {
			order := *bot.CurrentOrder
			bots[index].CurrentOrder = &order
		}
	}

	return Snapshot{PendingOrders: pending, CompletedOrders: completed, Bots: bots}
}

type Event struct{}
