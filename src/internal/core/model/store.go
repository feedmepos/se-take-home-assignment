package model

import "time"

type Store struct {
	orders      []*Order
	bots        []*Bot
	nextOrderID int
	nextBotID   int
}

func NewStore() *Store {
	return &Store{
		orders:      []*Order{},
		bots:        []*Bot{},
		nextOrderID: 10000001,
		nextBotID:   1001,
	}
}

func (s *Store) CreateOrder(priority OrderPriority) *Order {
	order := NewOrder(s.nextOrderID, priority, OrderStatusPending)
	s.nextOrderID++
	s.orders = append(s.orders, order)
	return order
}

func (s *Store) CreateBot(processDuration time.Duration) *Bot {
	bot := NewBot(s.nextBotID, BotStatusIdle, processDuration)
	s.nextBotID++
	s.bots = append(s.bots, bot)
	return bot
}

func (s *Store) LastBot() (*Bot, bool) {
	if len(s.bots) == 0 {
		return nil, false
	}
	return s.bots[len(s.bots)-1], true
}

func (s *Store) RemoveLastBot() (*Bot, bool) {
	if len(s.bots) == 0 {
		return nil, false
	}
	bot := s.bots[len(s.bots)-1]
	s.bots = s.bots[:len(s.bots)-1]
	return bot, true
}

func (s *Store) Orders() []*Order {
	return s.orders
}

func (s *Store) Bots() []*Bot {
	return s.bots
}
