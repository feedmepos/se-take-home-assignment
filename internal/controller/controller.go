package controller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/Splinglove/se-take-home-assignment/internal/bot"
	"github.com/Splinglove/se-take-home-assignment/internal/order"
)

type Snapshot struct {
	Pending  []*order.Order
	Complete []*order.Order
	Bots     []*bot.Bot
}

type botHandle struct {
	bot    *bot.Bot
	cancel context.CancelFunc
	ctx    context.Context
}

type Controller struct {
	mu          sync.Mutex
	cond        *sync.Cond
	processTime time.Duration
	log         func(string)
	nextOrderID int
	nextBotID   int
	pending     []*order.Order
	complete    []*order.Order
	bots        []*botHandle
}

func New(processTime time.Duration, logFn func(string)) *Controller {
	if logFn == nil {
		logFn = func(string) {}
	}
	c := &Controller{
		processTime: processTime,
		log:         logFn,
		nextOrderID: 1,
		nextBotID:   1,
	}
	c.cond = sync.NewCond(&c.mu)
	return c
}

func (c *Controller) CreateNormalOrder() *order.Order {
	return c.createOrder(order.TypeNormal)
}

func (c *Controller) CreateVIPOrder() *order.Order {
	return c.createOrder(order.TypeVIP)
}

func (c *Controller) createOrder(t order.Type) *order.Order {
	c.mu.Lock()
	defer c.mu.Unlock()
	o := &order.Order{
		ID:     c.nextOrderID,
		Type:   t,
		Status: order.StatusPending,
	}
	c.nextOrderID++
	c.pending = order.InsertPending(c.pending, o)
	c.log(fmt.Sprintf("Created %s Order #%d - Status: PENDING", t, o.ID))
	c.cond.Broadcast()
	return o
}

func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	pending := append([]*order.Order(nil), c.pending...)
	complete := append([]*order.Order(nil), c.complete...)
	bots := make([]*bot.Bot, 0, len(c.bots))
	for _, h := range c.bots {
		cp := *h.bot
		bots = append(bots, &cp)
	}
	return Snapshot{Pending: pending, Complete: complete, Bots: bots}
}
