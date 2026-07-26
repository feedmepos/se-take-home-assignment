package application

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/feedmepos/se-take-home-assignment/internal/domain"
)

type botEntry struct {
	bot    *domain.Bot
	cancel context.CancelFunc
}

type BotApp struct {
	event       domain.EventBus
	orderVIP    domain.OrderApp
	orderNormal domain.OrderApp

	bots      []*botEntry
	nextBotID uint

	stop chan struct{}
	wg   sync.WaitGroup
}

func NewBotApp(orderVIP domain.OrderApp, orderNormal domain.OrderApp, event domain.EventBus) *BotApp {
	return &BotApp{
		event:       event,
		orderVIP:    orderVIP,
		orderNormal: orderNormal,
		stop:        make(chan struct{}),
	}
}

func (a *BotApp) Listen() {
	const pollInterval = 100 * time.Millisecond

	for {
		select {
		case <-a.stop:
			return
		default:
		}

		a.Wait()

		time.Sleep(pollInterval)
	}
}

func (a *BotApp) Wait() {
	for _, entry := range a.bots {
		if entry.bot.Order != nil && entry.bot.Order.IsProcessing() {
			continue
		}

		orderApp, order := a.PickOrder()
		if order == nil {
			if entry.bot.Status != domain.BotStatusIdle {
				entry.bot.Idle()
				a.event.BotIdle(*entry.bot)
			}

			continue
		}

		ctx, cancel := context.WithCancel(context.Background())
		entry.cancel = cancel
		entry.bot.Order = order
		entry.bot.Status = domain.BotStatusActive

		a.wg.Add(1)
		go func(entry *botEntry, order *domain.Order) {
			defer a.wg.Done()
			if err := orderApp.Process(ctx, *entry.bot, order); err != nil {
				log.Println("Process:", err)
				return
			}
		}(entry, order)
	}
}

func (a *BotApp) Close() {
	close(a.stop)

	for _, entry := range a.bots {
		if entry.cancel != nil {
			entry.cancel()
		}
	}

	a.wg.Wait()
}

func (a *BotApp) AddBot() *domain.Bot {
	a.nextBotID++
	bot := domain.NewBot(a.nextBotID)

	a.bots = append(a.bots, &botEntry{
		bot: bot,
	})

	a.event.BotCreated(*bot)

	log.Println("Bot added!")

	return bot
}

func (a *BotApp) ListBot() []*botEntry {
	return a.bots
}

func (a *BotApp) RemoveBot() error {
	if len(a.bots) == 0 {
		return errors.New("No more bot!")
	}

	last := len(a.bots) - 1
	entry := a.bots[last]

	a.bots[last] = nil
	a.bots = a.bots[:last]

	if entry.bot.Order != nil && entry.bot.Order.IsProcessing() {
		entry.cancel()

		orderApp := a.getOrderApp(*entry.bot.Order)
		orderApp.ReQueue(entry.bot.Order)
	}

	a.event.BotDestroyed(*entry.bot)

	log.Println("Bot removed!")
	return nil
}

func (a *BotApp) PickOrder() (domain.OrderApp, *domain.Order) {
	order := a.orderVIP.Pick()
	if order != nil {
		return a.orderVIP, order
	}

	return a.orderNormal, a.orderNormal.Pick()
}

func (a *BotApp) getOrderApp(o domain.Order) domain.OrderApp {
	if o.Type == domain.OrderTypeVIP {
		return a.orderVIP
	}

	return a.orderNormal
}
