package order

import (
	"fmt"
	"sync"
	"time"
)

type Controller struct {
	mu             sync.Mutex
	orderIDCounter int
	botIDCounter   int
	pendingVIP     []*Order
	pendingNormal  []*Order
	processing     []*Order
	completed      []*Order
	bots           []Bot
	events         []string
	afterFunc      AfterFunc
	now            func() time.Time
}

func NewController() *Controller {
	return NewControllerWithTimer(realAfterFunc)
}

func NewControllerWithTimer(afterFunc AfterFunc) *Controller {
	return NewControllerWithTimerAndClock(afterFunc, time.Now)
}

func NewControllerWithTimerAndClock(afterFunc AfterFunc, now func() time.Time) *Controller {
	if afterFunc == nil {
		afterFunc = realAfterFunc
	}
	if now == nil {
		now = time.Now
	}

	controller := &Controller{
		orderIDCounter: 1000,
		afterFunc:      afterFunc,
		now:            now,
	}
	controller.logEvent("System initialized with 0 bots")
	return controller
}

func realAfterFunc(duration time.Duration, callback func()) Timer {
	return time.AfterFunc(duration, callback)
}

func (c *Controller) logEvent(format string, args ...any) {
	line := fmt.Sprintf("[%s] %s",
		c.now().Format("15:04:05"),
		fmt.Sprintf(format, args...),
	)

	c.events = append(c.events, line)
	fmt.Println(line)
}

func (c *Controller) nextBotID() int {
	c.botIDCounter++
	return c.botIDCounter
}

func (c *Controller) nextOrderID() int {
	c.orderIDCounter++
	return c.orderIDCounter
}
