package model

import "context"

// Bot 表示一个烹饪机器人
type Bot struct {
	ID           int
	CurrentOrder *Order
	Ctx          context.Context
	cancel       context.CancelFunc
}

// NewBot 创建一个新的 Bot 实例
func NewBot(id int, ctx context.Context, cancel context.CancelFunc) *Bot {
	return &Bot{
		ID:     id,
		Ctx:    ctx,
		cancel: cancel,
	}
}

// TakeOrder 接管一个订单
func (b *Bot) TakeOrder(order *Order) {
	b.CurrentOrder = order
}

// CompleteOrder 完成当前订单，仅在仍持有该订单时返回该订单（防止竞态）
func (b *Bot) CompleteOrder(order *Order) *Order {
	if b.CurrentOrder != order {
		return nil
	}
	b.CurrentOrder = nil
	order.Status = OrderComplete
	return order
}

// ReleaseOrder 退回当前订单到 PENDING 状态
func (b *Bot) ReleaseOrder() *Order {
	order := b.CurrentOrder
	if order != nil {
		order.Status = OrderPending
		b.CurrentOrder = nil
	}
	return order
}

// HasOrder 是否有正在处理的订单
func (b *Bot) HasOrder() bool {
	return b.CurrentOrder != nil
}

// OrderType 返回当前订单的类型（仅在 HasOrder 为 true 时有效）
func (b *Bot) OrderType() OrderType {
	if b.CurrentOrder == nil {
		return -1 // 返回无效值，调用者应先用 HasOrder 检查
	}
	return b.CurrentOrder.Type
}

// OrderID 返回当前订单的 ID（仅在 HasOrder 为 true 时有效）
func (b *Bot) OrderID() int {
	if b.CurrentOrder == nil {
		return 0
	}
	return b.CurrentOrder.ID
}

// Cancel 取消 Bot 的上下文，停止其工作循环
func (b *Bot) Cancel() {
	b.cancel()
}
