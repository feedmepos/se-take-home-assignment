package controller

import (
	"fmt"
	"slices"
	"sync"
	"time"
)

var timeoutSeconds = 10

type Controller struct {
	Pendings    []*Order
	Completes   []*Order
	Bots        []*Bot
	nextOrderId int
	nextBotId   int
	wg          *sync.WaitGroup
	mu          sync.Mutex
}

func NewController() *Controller {
	return &Controller{
		Pendings:    []*Order{},
		Completes:   []*Order{},
		Bots:        []*Bot{},
		nextOrderId: 1,
		nextBotId:   1,
		wg:          &sync.WaitGroup{},
	}
}

func (c *Controller) AddVipOrder() *Order {
	c.mu.Lock()
	o := &Order{
		id:        c.nextOrderId,
		orderType: vip,
		status:    pending,
		createdAt: time.Now(),
	}
	c.nextOrderId++
	c.wg.Add(1)

	i := 0
	for i < len(c.Pendings) && c.Pendings[i].orderType == vip {
		i++
	}
	c.Pendings = slices.Insert(c.Pendings, i, o)
	Log(fmt.Sprintf("Created %s Order #%d - Status: %s", o.orderType, o.id, o.status))
	c.mu.Unlock()

	go c.processNext()
	return o
}

func (c *Controller) AddNormalOrder() *Order {
	c.mu.Lock()
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
	c.mu.Unlock()

	go c.processNext()
	return o
}

func (c *Controller) AddBot() *Bot {
	c.mu.Lock()
	b := &Bot{
		id:           c.nextBotId,
		status:       idle,
		currentOrder: nil,
		onCompleted:  make(chan *Order, 1),
	}
	c.nextBotId++

	c.Bots = append(c.Bots, b)
	Log(fmt.Sprintf("Bot #%d created - Status: ACTIVE", b.id))
	c.mu.Unlock()

	go c.processNext()
	go c.handleCompletedOrder(b)
	return b
}

func (c *Controller) RemoveBot() {
	c.mu.Lock()
	n := len(c.Bots)

	if n == 0 {
		c.mu.Unlock()
		return
	}

	b := c.Bots[n-1]
	c.Bots = c.Bots[:n-1]

	o := b.stopProcessing()
	close(b.onCompleted)

	if o != nil {
		Log(fmt.Sprintf("Bot #%d destroyed while %s", b.id, processing))
		Log(fmt.Sprintf("Recreated %s Order #%d - Status: %s", o.orderType, o.id, o.status))
		if o.orderType == vip {
			i := 0
			for i < len(c.Pendings) && c.Pendings[i].orderType == vip {
				i++
			}
			c.Pendings = slices.Insert(c.Pendings, i, o)
		} else {
			c.Pendings = append(c.Pendings, o)
		}
	} else {
		Log(fmt.Sprintf("Bot #%d destroyed while %s", b.id, idle))
	}

	c.mu.Unlock()

	if o != nil {
		go c.processNext()
	}
}

func (c *Controller) processNext() {

	c.mu.Lock()

	if len(c.Pendings) == 0 {
		c.mu.Unlock()
		return
	}

	var b *Bot
	for _, bot := range c.Bots {
		if bot.getIsIdle() {
			b = bot
			Log(fmt.Sprintf("Bot #%d is now IDLE - %d pending orders", b.id, len(c.Pendings)))
			break
		}
	}

	if b == nil {
		c.mu.Unlock()
		return
	}

	o := c.Pendings[0]
	c.Pendings = c.Pendings[1:]

	Log(fmt.Sprintf(
		"Bot #%d picked up %s Order #%d - Status: %s",
		b.id, o.orderType, o.id, processing,
	))

	c.mu.Unlock()

	go b.processOrder(o)
}

func (c *Controller) handleCompletedOrder(b *Bot) {
	for o := range b.onCompleted {
		c.mu.Lock()
		c.Completes = append(c.Completes, o)
		c.mu.Unlock()

		Log(fmt.Sprintf(
			"Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %s)",
			b.id, o.orderType, o.id, processTime,
		))

		c.wg.Done()
		go c.processNext()
	}
}

func (c *Controller) WaitUntilDone() {
	c.mu.Lock()
	hasBots := len(c.Bots) > 0
	c.mu.Unlock()

	done := make(chan struct{})
	go func() {
		c.wg.Wait()
		close(done)
	}()

	if hasBots {
		<-done
		return
	}

	timer := time.NewTimer(time.Duration(timeoutSeconds) * time.Second)
	defer timer.Stop()

	<-timer.C
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
