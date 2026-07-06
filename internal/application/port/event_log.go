package port

import "github.com/lijian-bj/se-take-home-assignment/internal/domain/ordercontroller"

// EventLog 是订单控制器审计日志的驱动端口，由基础设施层适配到 stdout 等输出目标。
type EventLog interface {
	SystemStarted()
	OrderCreated(order ordercontroller.Order, pending ordercontroller.PendingQueue)
	BotCreated(id int)
	BotPicked(botID int, order ordercontroller.Order, pickupIndex int)
	BotCompleted(botID int, order ordercontroller.Order, complete []int)
	BotIdle(botID int)
	BotInterrupted(botID int, order ordercontroller.Order, pickupIndex int, pending ordercontroller.PendingQueue)
	BotRemoved(botID int)
	StatusSnapshot(snap ordercontroller.Snapshot)
	Warn(msg string)
}
