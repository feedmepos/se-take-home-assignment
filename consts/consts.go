package consts

import (
	"slices"
	"time"
)

// Order cooking time
var OrderCookTime = 10 * time.Second

type OrderStatus int

const (
	OrderStatusPending    OrderStatus = 0
	OrderStatusProcessing OrderStatus = 1
	OrderStatusCompleted  OrderStatus = 2
)

type OrderPriority int

const (
	OrderPriorityNormal OrderPriority = 0
	OrderPriorityVip    OrderPriority = 1
)

var orderPriorities = []OrderPriority{
	OrderPriorityNormal,
	OrderPriorityVip,
}

func OrderPriorityValidate(priority int) bool {
	return slices.Contains(orderPriorities, OrderPriority(priority))
}

type BotStatus int

const (
	BotStatusIdle    BotStatus = 0 // Idle
	BotStatusCooking BotStatus = 1 // Cooking
)
