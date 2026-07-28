package restaurant

import (
	"errors"
	"fmt"
	"time"
)

const ProcessingDuration = 10 * time.Second

type Event struct {
	Message string
}

type Restaurant struct {
	orders *orderQueue
	robots *robotFleet
}

func New() *Restaurant {
	return &Restaurant{
		orders: newOrderQueue(),
		robots: newRobotFleet(),
	}
}

func (r *Restaurant) AddOrder(priority Priority, amountCents int64, now time.Time) (*Order, []Event) {
	order := r.orders.create(priority, amountCents, now)
	events := []Event{{Message: fmt.Sprintf("Created %s Order #%d - Status: %s", priority, order.OrderNo, order.Status)}}
	return order, append(events, r.Schedule(now)...)
}

func (r *Restaurant) AddRobot(name string, now time.Time) (*Robot, []Event) {
	robot := r.robots.add(name)
	events := []Event{{Message: fmt.Sprintf("%s created - Status: %s", robot.Name, robot.Status)}}
	return robot, append(events, r.Schedule(now)...)
}

func (r *Restaurant) RemoveNewestRobot(now time.Time) ([]Event, error) {
	robot, ok := r.robots.removeNewest()
	if !ok {
		return nil, errors.New("no robots are available to remove")
	}

	events := make([]Event, 0, 2)
	if robot.CurrentOrderID != nil {
		order := r.orders.get(*robot.CurrentOrderID)
		r.orders.returnToPending(order)
		robot.CurrentOrderID = nil
		robot.Status = Idle
		events = append(events, Event{Message: fmt.Sprintf("%s destroyed while processing Order #%d; order returned to PENDING", robot.Name, order.OrderNo)})
	} else {
		events = append(events, Event{Message: fmt.Sprintf("%s destroyed while IDLE", robot.Name)})
	}
	return append(events, r.Schedule(now)...), nil
}

func (r *Restaurant) Tick(now time.Time) []Event {
	events := make([]Event, 0)
	releasedRobots := make([]*Robot, 0)
	for _, robot := range r.robots.robots {
		if robot.CurrentOrderID == nil {
			continue
		}
		order := r.orders.get(*robot.CurrentOrderID)
		if order.ProductionStartedAt == nil || now.Sub(*order.ProductionStartedAt) < ProcessingDuration {
			continue
		}

		completedAt := now
		order.Status = Completed
		order.ProductionCompletedAt = &completedAt
		robot.CurrentOrderID = nil
		robot.Status = Idle
		events = append(events, Event{Message: fmt.Sprintf("%s completed %s Order #%d - Status: %s (Processing time: %s)", robot.Name, order.Priority, order.OrderNo, order.Status, ProcessingDuration)})
		releasedRobots = append(releasedRobots, robot)
	}
	events = append(events, r.Schedule(now)...)
	for _, robot := range releasedRobots {
		if robot.CurrentOrderID == nil {
			events = append(events, Event{Message: fmt.Sprintf("%s is now IDLE - No pending orders", robot.Name)})
		}
	}
	return events
}

// Schedule assigns pending orders to every available robot. It must be called
// only by the restaurant's single owning event loop.
func (r *Restaurant) Schedule(now time.Time) []Event {
	events := make([]Event, 0)
	for _, robot := range r.robots.robots {
		if robot.CurrentOrderID != nil {
			continue
		}
		order := r.orders.takeNextPending()
		if order == nil {
			continue
		}

		startedAt := now
		order.Status = Processing
		order.ProductionStartedAt = &startedAt
		robot.CurrentOrderID = &order.ID
		robot.Status = Busy
		events = append(events, Event{Message: fmt.Sprintf("%s picked up %s Order #%d - Status: %s", robot.Name, order.Priority, order.OrderNo, order.Status)})
	}
	return events
}

func (r *Restaurant) Snapshot() Snapshot {
	return Snapshot{
		Orders: r.orders.snapshot(),
		Robots: r.robots.snapshot(),
	}
}

type Snapshot struct {
	Orders []Order
	Robots []Robot
}
