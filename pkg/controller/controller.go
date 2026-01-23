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
	mu          sync.Mutex
}

func (c *Controller) AddVipOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	o := &Order{
		id:        c.nextOrderId,
		orderType: vip,
		status:    pending,
		createdAt: time.Now(),
	}
	c.nextOrderId++

	var i = 0
	for i < len(c.Pendings) && c.Pendings[i].orderType == vip {
		i++
	}
	c.wg.Add(1)
	c.Pendings = slices.Insert(c.Pendings, i, o)
	Log(fmt.Sprintf("Created %s Order #%d - Status: %s", o.orderType, o.id, o.status))
	c.processNext()
	return o
}

func (c *Controller) AddNormalOrder() *Order {
	c.mu.Lock()
	defer c.mu.Unlock()

	o := &Order{
		id:        c.nextOrderId,
		orderType: normal,
		status:    pending,
		createdAt: time.Now(),
	}

	c.nextOrderId++
	c.wg.Add(1)
	c.Pendings = append(c.Pendings, o)
	Log(fmt.Sprintf("Created %s Order #%d - Status: %s", o.orderType, o.id, o.status))
	c.processNext()
	return o
}

func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	defer c.mu.Unlock()

	b := &Bot{
		id:           c.nextBotId,
		status:       idle,
		currentOrder: nil,
		onCompleted:  make(chan *Order, 1),
	}
	c.nextBotId++
	c.Bots = append(c.Bots, b)
	go c.handleCompletedOrder(b)
	Log(fmt.Sprintf("Bot #%d created - Status: ACTIVE", b.id))
	c.processNext()
	return b
}

func (c *Controller) RemoveBot() {
	c.mu.Lock()
	defer c.mu.Unlock()

	nBot := len(c.Bots)

	if nBot == 0 {
		return
	}

	b := c.Bots[nBot-1]
	c.Bots = c.Bots[:nBot-1]
	o := b.stopProcessing()
	close(b.onCompleted)

	Log(fmt.Sprintf("Bot #%d destroyed while %s", b.id, b.status))
	if o == nil {
		return
	}

	Log(fmt.Sprintf("Recreated %s Order #%d - Status: %s", o.orderType, o.id, o.status))
	if o.orderType == vip {
		var i = 0
		for i < len(c.Pendings) && c.Pendings[i].orderType == vip {
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
		c.mu.Lock()
		c.Completes = append(c.Completes, o)
		Log(fmt.Sprintf("Bot #%d completed %s Order #%d - Status: %s (Processing time: %s)", b.id, o.orderType, o.id, b.status, processTime))
		c.processNext()
		c.mu.Unlock()
		c.wg.Done()
	}
}

func (c *Controller) processNext() {
	for _, b := range c.Bots {
		if b.status != idle {
			continue
		}

		if len(c.Pendings) == 0 {
			return
		}

		o := c.Pendings[0]
		c.Pendings = c.Pendings[1:]

		Log(fmt.Sprintf("Bot #%d picked up %s Order #%d - Status: %s", b.id, o.orderType, o.id, o.status))

		b.startProcessing(o)
	}
}

func (c *Controller) WaitUntilDone() {
	c.wg.Wait()
}

func (c *Controller) PrintStatus() {
	c.mu.Lock()
	defer c.mu.Unlock()

	fmt.Println("\nFinal Status:")

	vipCount, normalCount := 0, 0
	for _, o := range c.Completes {
		if o.orderType == vip {
			vipCount++
			continue
		}
		normalCount++
	}

	fmt.Printf("- Total Orders Processed: %d (%d VIP, %d Normal)\n",
		len(c.Completes), vipCount, normalCount)
	fmt.Printf("- Orders Completed: %d\n", len(c.Completes))
	fmt.Printf("- Active Bots: %d\n", len(c.Bots))
	fmt.Printf("- Pending Orders: %d\n", len(c.Pendings))
}
