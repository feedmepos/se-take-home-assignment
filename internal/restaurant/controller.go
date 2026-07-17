package restaurant

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"
)

type CommandType int

const (
	CreateNormalOrder CommandType = iota
	CreateVIPOrder
	AddRobotCommand
	RemoveRobotCommand
	StatusCommand
)

type Command struct {
	Type        CommandType
	AmountCents int64
	RobotName   string
}

type Response struct {
	Snapshot Snapshot
	Err      error
}

type request struct {
	command Command
	reply   chan Response
}

// Controller serializes commands and clock ticks. Restaurant state is only
// accessed by its event-loop goroutine, which prevents command/tick races.
type Controller struct {
	commands chan request
	done     chan struct{}
}

func NewController(logOutput io.Writer, tickInterval time.Duration) *Controller {
	controller := &Controller{
		commands: make(chan request),
		done:     make(chan struct{}),
	}
	go controller.run(logOutput, tickInterval)
	return controller
}

func (c *Controller) Submit(ctx context.Context, command Command) Response {
	reply := make(chan Response, 1)
	request := request{command: command, reply: reply}
	select {
	case c.commands <- request:
	case <-ctx.Done():
		return Response{Err: ctx.Err()}
	case <-c.done:
		return Response{Err: errors.New("controller has stopped")}
	}

	select {
	case response := <-reply:
		return response
	case <-ctx.Done():
		return Response{Err: ctx.Err()}
	case <-c.done:
		return Response{Err: errors.New("controller has stopped")}
	}
}

func (c *Controller) Close() {
	select {
	case <-c.done:
		return
	default:
		close(c.done)
	}
}

func (c *Controller) run(logOutput io.Writer, tickInterval time.Duration) {
	restaurant := New()
	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()

	writeEvents(logOutput, time.Now(), []Event{{Message: "System initialized with 0 bots"}})
	for {
		select {
		case <-c.done:
			return
		case now := <-ticker.C:
			writeEvents(logOutput, now, restaurant.Tick(now))
		case request := <-c.commands:
			now := time.Now()
			var events []Event
			var err error
			switch request.command.Type {
			case CreateNormalOrder:
				_, events = restaurant.AddOrder(Normal, request.command.AmountCents, now)
			case CreateVIPOrder:
				_, events = restaurant.AddOrder(VIP, request.command.AmountCents, now)
			case AddRobotCommand:
				_, events = restaurant.AddRobot(request.command.RobotName, now)
			case RemoveRobotCommand:
				events, err = restaurant.RemoveNewestRobot(now)
			case StatusCommand:
				writeSnapshot(logOutput, now, restaurant.Snapshot())
			default:
				err = errors.New("unknown command")
			}
			writeEvents(logOutput, now, events)
			request.reply <- Response{Snapshot: restaurant.Snapshot(), Err: err}
		}
	}
}

func writeEvents(output io.Writer, now time.Time, events []Event) {
	for _, event := range events {
		fmt.Fprintf(output, "[%s] %s\n", now.Format("15:04:05"), event.Message)
	}
}

func writeSnapshot(output io.Writer, now time.Time, snapshot Snapshot) {
	pending, processing, completed := 0, 0, 0
	for _, order := range snapshot.Orders {
		switch order.Status {
		case Pending:
			pending++
		case Processing:
			processing++
		case Completed:
			completed++
		}
	}
	fmt.Fprintf(output, "[%s] Status: bots=%d, pending=%d, processing=%d, completed=%d\n", now.Format("15:04:05"), len(snapshot.Robots), pending, processing, completed)
}

