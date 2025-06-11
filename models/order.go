package models

import (
	"sync"

	"idreamshen.com/fmcode/consts"
)

type Order struct {
	ID         int64
	Priority   consts.OrderPriority
	Status     consts.OrderStatus
	CustomerID int64
	BotID      int64

	mutex sync.Mutex
}

func (o *Order) Lock() {
	o.mutex.Lock()
}

func (o *Order) Unlock() {
	o.mutex.Unlock()
}
