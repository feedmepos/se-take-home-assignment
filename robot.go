package main

import (
	"os"
	"strconv"
	"sync"
	"time"
)

var CookTime = 10 * time.Second

func init() {
	if val := os.Getenv("COOK_TIME_SECONDS"); val != "" {
		if seconds, err := strconv.Atoi(val); err == nil && seconds > 0 {
			CookTime = time.Duration(seconds) * time.Second
		}
	}
}

type RobotStatus string

const (
	StatusIdle     RobotStatus = "IDLE"
	StatusCooking  RobotStatus = "COOKING"
	StatusDestroyed RobotStatus = "DESTROYED"
)

type Robot struct {
	ID          int
	Status      RobotStatus
	currentOrder *Order
	mu          sync.Mutex
	done        chan struct{}
	quit        chan struct{}
	queue       *OrderQueue
	logger      Logger
}

func NewRobot(id int, queue *OrderQueue, logger Logger) *Robot {
	robot := &Robot{
		ID:     id,
		Status: StatusIdle,
		done:   make(chan struct{}),
		quit:   make(chan struct{}),
		queue:  queue,
		logger: logger,
	}
	go robot.workLoop()
	return robot
}

func (r *Robot) workLoop() {
	for {
		order := r.queue.GetNextOrder()
		if order == nil {
			prevStatus := r.GetStatus()
			r.setStatus(StatusIdle)
			if prevStatus != StatusIdle && r.logger != nil {
				r.logger.Logf("[Robot %d] No orders available, becoming IDLE", r.ID)
			}
			select {
			case <-r.done:
				close(r.quit)
				return
			case <-time.After(100 * time.Millisecond):
				continue
			}
		}

		select {
		case <-r.done:
			r.queue.PutBackOrder(order)
			r.logger.Logf("[Robot %d] Order %d returned to pending queue (interrupted before start)", r.ID, order.ID)
			close(r.quit)
			return
		default:
		}

		r.mu.Lock()
		r.currentOrder = order
		r.mu.Unlock()
		r.setStatus(StatusCooking)

		r.logger.Logf("[Robot %d] Start cooking Order %d (%s)", r.ID, order.ID, order.Type)

		cookTimer := time.NewTimer(CookTime)
		select {
		case <-cookTimer.C:
			r.mu.Lock()
			r.currentOrder = nil
			r.mu.Unlock()
			r.queue.CompleteOrder(order)
			r.logger.Logf("[Robot %d] Order %d completed", r.ID, order.ID)
		case <-r.done:
			cookTimer.Stop()
			r.mu.Lock()
			r.currentOrder = nil
			r.mu.Unlock()
			r.logger.Logf("[Robot %d] Interrupting Order %d (Type=%s), returning to queue", r.ID, order.ID, order.Type)
			r.queue.PutBackOrder(order)
			r.logger.Logf("[Robot %d] Order %d returned to pending queue successfully", r.ID, order.ID)
			close(r.quit)
			return
		}
	}
}

func (r *Robot) Destroy() {
	r.setStatus(StatusDestroyed)
	if r.logger != nil {
		r.logger.Logf("[Robot %d] Destroyed, status set to DESTROYED", r.ID)
	}
	close(r.done)
	<-r.quit
}

func (r *Robot) setStatus(status RobotStatus) {
	r.mu.Lock()
	r.Status = status
	r.mu.Unlock()
}

func (r *Robot) GetStatus() RobotStatus {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.Status
}

func (r *Robot) GetCurrentOrder() *Order {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.currentOrder
}
