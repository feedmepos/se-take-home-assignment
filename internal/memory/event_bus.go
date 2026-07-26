package memory

import (
	"fmt"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/domain"
	"github.com/feedmepos/se-take-home-assignment/pkg"
)

type EventBus struct {
	events chan domain.Event
	writer *pkg.FileWriter
	done   chan struct{}
}

func NewEventBus(writer *pkg.FileWriter) *EventBus {
	return &EventBus{
		events: make(chan domain.Event),
		writer: writer,
		done:   make(chan struct{}),
	}
}

func (b *EventBus) BotCreated(bot domain.Bot) {
	msg := fmt.Sprintf("Bot #%d created - Status: %s", bot.ID, bot.Status)

	b.events <- domain.Event{Kind: domain.BotCreated, Message: msg, Timestamp: time.Now()}
}

func (b *EventBus) OrderCreated(order domain.Order) {
	msg := fmt.Sprintf("Created %s Order #%d - Status: %s", order.Type, order.ID, order.Status)

	b.events <- domain.Event{Kind: domain.OrderCreated, Message: msg, Timestamp: time.Now()}
}

func (b *EventBus) OrderPickedUp(bot domain.Bot, order domain.Order) {
	msg := fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: PROCESSING", bot.ID, order.Type, order.ID)

	b.events <- domain.Event{Kind: domain.OrderPickedUp, Message: msg, Timestamp: time.Now()}
}

func (b *EventBus) OrderReQueued(order domain.Order) {
	msg := fmt.Sprintf("Order #%d (%s) re-queued", order.ID, order.Type)

	b.events <- domain.Event{Kind: domain.OrderReQueued, Message: msg, Timestamp: time.Now()}
}

func (b *EventBus) OrderCompleted(bot domain.Bot, order domain.Order, duration time.Duration) {
	msg := fmt.Sprintf("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %s)", bot.ID, order.Type, order.ID, duration.Round(time.Second))

	b.events <- domain.Event{Kind: domain.OrderCompleted, Message: msg, Timestamp: time.Now()}
}

func (b *EventBus) BotIdle(bot domain.Bot) {
	msg := fmt.Sprintf("Bot #%d is now IDLE - No pending orders", bot.ID)

	b.events <- domain.Event{Kind: domain.BotIdle, Message: msg, Timestamp: time.Now()}
}

func (b *EventBus) BotDestroyed(bot domain.Bot) {
	msg := fmt.Sprintf("Bot #%d destroyed while %s", bot.ID, bot.Status)

	b.events <- domain.Event{Kind: domain.BotDestroyed, Message: msg, Timestamp: time.Now()}
}

func (b *EventBus) Listen() {
	defer close(b.done)

	for e := range b.events {
		line := fmt.Sprintf("[%s] %s", e.Timestamp.Format("15:04:05"), e.Message)
		if err := b.writer.Write(line); err != nil {
			fmt.Println("event bus: write failed:", err)
		}
	}
}

func (b *EventBus) Close() {
	close(b.events)
	<-b.done
}
