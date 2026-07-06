package ordercontroller

// BotState 表示烹饪 Bot 的运行状态。
type BotState string

const (
	BotStateIdle       BotState = "IDLE"       // 空闲，未绑定订单
	BotStateProcessing BotState = "PROCESSING" // 正在处理订单
)

// Bot 是烹饪机器人实体，同一时刻最多处理一个订单。
type Bot struct {
	ID           int      // Bot 编号，按创建顺序从 1 递增
	State        BotState // 当前状态
	CurrentOrder *Order   // 正在处理的订单；空闲时为 nil
	PickupIndex  int      // 取单时订单在逻辑待处理队列中的 0-based 索引，用于 -bot 回插
}

// NewBot 创建指定 ID 的空闲 Bot。
func NewBot(id int) Bot {
	return Bot{ID: id, State: BotStateIdle, PickupIndex: -1}
}

// IsIdle 判断 Bot 是否处于空闲状态。
func (b *Bot) IsIdle() bool {
	return b.State == BotStateIdle
}

// IsProcessing 判断 Bot 是否正在处理订单。
func (b *Bot) IsProcessing() bool {
	return b.State == BotStateProcessing && b.CurrentOrder != nil
}

// CanAcceptOrder 判断 Bot 是否可以接受新订单（空闲或刚清空处理状态）。
func (b *Bot) CanAcceptOrder() bool {
	return b.State == BotStateIdle || (b.State == BotStateProcessing && b.CurrentOrder == nil)
}

// StartProcessing 让 Bot 开始处理订单，并记录取单时的队列位置。
func (b *Bot) StartProcessing(order Order, pickupIndex int) {
	b.State = BotStateProcessing
	b.CurrentOrder = &order
	b.PickupIndex = pickupIndex
}

// ClearProcessing 清除当前处理中的订单信息，Bot 仍保持 PROCESSING 状态以便链式取单。
func (b *Bot) ClearProcessing() {
	b.CurrentOrder = nil
	b.PickupIndex = -1
}

// SetIdle 将 Bot 设为空闲并清除所有处理状态。
func (b *Bot) SetIdle() {
	b.State = BotStateIdle
	b.ClearProcessing()
}
