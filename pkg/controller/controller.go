package controller

import (
	"fmt"
	"slices"
	"sync"
	"time"
)

type Controller struct {
	Pendings    []*Order
	Completes   []*Order
	Bots        []*Bot
	nextOrderId int
	nextBotId   int
	wg          sync.WaitGroup
}

func (c *Controller) AddVipOrder() *Order {
	o := &Order{
		ID:        c.nextOrderId,
		Type:      VIP,
		Status:    Pending,
		CreatedAt: time.Now(),
	}
	c.nextOrderId++

	var i = 0
	for i < len(c.Pendings) && c.Pendings[i].Type == VIP {
		i++
	}
	c.wg.Add(1)
	c.Pendings = slices.Insert(c.Pendings, i, o)
	Log(fmt.Sprintf("Created %s Order #%d - Status: %s", o.Type, o.ID, o.Status))
	c.processNext()
	return o
}

func (c *Controller) AddNormalOrder() *Order {
	o := &Order{
		ID:        c.nextOrderId,
		Type:      Normal,
		Status:    Pending,
		CreatedAt: time.Now(),
	}

	c.nextOrderId++
	c.wg.Add(1)
	c.Pendings = append(c.Pendings, o)
	Log(fmt.Sprintf("Created %s Order #%d - Status: %s", o.Type, o.ID, o.Status))
	c.processNext()
	return o
}

func (c *Controller) AddBot() *Bot {
	b := &Bot{
		ID:           c.nextBotId,
		Status:       Idle,
		CurrentOrder: nil,
		onCompleted:  make(chan *Order, 1),
	}
	c.nextBotId++
	c.Bots = append(c.Bots, b)
	go c.handleCompletedOrder(b)
	Log(fmt.Sprintf("Bot #%d created - Status: ACTIVE", b.ID))
	c.processNext()
	return b
}

func (c *Controller) RemoveBot() {
	nBot := len(c.Bots)

	if nBot == 0 {
		return
	}

	b := c.Bots[nBot-1]
	c.Bots = c.Bots[:nBot-1]
	o := b.StopProcessing()
	close(b.onCompleted)

	Log(fmt.Sprintf("Bot #%d destroyed while %s", b.ID, b.Status))
	if o == nil {
		return
	}

	Log(fmt.Sprintf("Recreated %s Order #%d - Status: %s", o.Type, o.ID, o.Status))
	if o.Type == VIP {
		var i = 0
		for i < len(c.Pendings) && c.Pendings[i].Type == VIP {
			i++
		}
		c.Pendings = slices.Insert(c.Pendings, i, o)
	} else {
		c.Pendings = append(c.Pendings, o)
	}
	c.processNext()
}

func (c *Controller) handleCompletedOrder(b *Bot) {
	for o := range b.onCompleted {
		c.Completes = append(c.Completes, o)
		Log(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: %s (Processing time: %s)", b.ID, o.Type, o.ID, o.Status, processTime))
		c.wg.Done()
		c.processNext()
	}
}

func (c *Controller) processNext() {
	for _, b := range c.Bots {
		if b.Status != Idle {
			continue
		}

		if len(c.Pendings) == 0 {
			return
		}

		o := c.Pendings[0]
		c.Pendings = c.Pendings[1:]

		Log(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: %s", b.ID, o.Type, o.ID, o.Status))

		b.StartProcessing(o)
	}
}

func (c *Controller) WaitUntilDone() {
	c.wg.Wait()
}
