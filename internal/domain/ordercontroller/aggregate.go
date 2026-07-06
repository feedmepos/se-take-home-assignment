package ordercontroller

// Snapshot 是聚合根状态的只读快照，供状态查询与日志输出。
type Snapshot struct {
	Pending  PendingQueue // 待处理队列
	Complete []Order      // 已完成订单列表（按完成顺序追加）
	Bots     []Bot        // 当前所有 Bot
}

// Assignment 记录 Bot 从待处理队列取走一单的结果。
type Assignment struct {
	BotID       int   // 取单的 Bot ID
	Order       Order // 被取走的订单
	PickupIndex int   // 取单时订单在逻辑队列中的位置
}

// BotRemoval 记录移除最新 Bot 的结果。
type BotRemoval struct {
	BotID       int    // 被移除的 Bot ID
	Interrupted *Order // 若 Bot 正在处理订单，则为被中断的订单；否则为 nil
	PickupIndex int    // 中断订单的原 pickupIndex，用于回插
}

// Completion 记录 Bot 完成一单的处理结果。
type Completion struct {
	BotID      int         // 完成订单的 Bot ID
	Order      Order       // 刚完成的订单
	HasNext    bool        // 是否立即取了下一单
	NextAssign *Assignment // 若 HasNext 为 true，则为下一单的取单信息
}

// OrderController 是订单控制器的聚合根，统一管理待处理队列、完成列表与 Bot 调度规则。
type OrderController struct {
	nextOrderID int          // 下一个订单 ID
	nextBotID   int          // 下一个 Bot ID
	pending     PendingQueue // 待处理队列
	complete    []Order      // 已完成订单
	bots        []Bot        // Bot 列表，按创建顺序排列
}

// NewOrderController 创建初始状态为空的订单控制器。
func NewOrderController() *OrderController {
	return &OrderController{nextOrderID: 1, nextBotID: 1}
}

// PlaceNormalOrder 创建普通订单并加入待处理队列 Normal 段末尾。
func (oc *OrderController) PlaceNormalOrder() Order {
	order := NewOrder(oc.nextOrderID, OrderTypeNormal)
	oc.nextOrderID++
	oc.pending.EnqueueNormal(order)
	return order
}

// PlaceVIPOrder 创建 VIP 订单并加入待处理队列 VIP 段末尾。
func (oc *OrderController) PlaceVIPOrder() Order {
	order := NewOrder(oc.nextOrderID, OrderTypeVIP)
	oc.nextOrderID++
	oc.pending.EnqueueVIP(order)
	return order
}

// AddBot 创建新 Bot 并追加到 Bot 列表末尾。
func (oc *OrderController) AddBot() Bot {
	bot := NewBot(oc.nextBotID)
	oc.nextBotID++
	oc.bots = append(oc.bots, bot)
	return bot
}

// RemoveLatestBot 按 LIFO 策略移除最新创建的 Bot。
// 若该 Bot 正在处理订单，则将订单按 pickupIndex 回插待处理队列。
func (oc *OrderController) RemoveLatestBot() (BotRemoval, error) {
	if len(oc.bots) == 0 {
		return BotRemoval{}, ErrNoBot
	}

	idx := len(oc.bots) - 1
	bot := oc.bots[idx]
	result := BotRemoval{BotID: bot.ID}

	if bot.IsProcessing() {
		order := *bot.CurrentOrder
		result.Interrupted = &order
		result.PickupIndex = bot.PickupIndex
		oc.pending.ReinsertAt(order, bot.PickupIndex)
	}

	oc.bots = append(oc.bots[:idx], oc.bots[idx+1:]...)
	return result, nil
}

// LowestIdleBotID 返回 ID 最小的空闲 Bot，用于新订单到达时的唤醒策略。
func (oc *OrderController) LowestIdleBotID() (int, bool) {
	for i := range oc.bots {
		if oc.bots[i].IsIdle() {
			return oc.bots[i].ID, true
		}
	}
	return 0, false
}

// TryAssignOrder 尝试让指定 Bot 从待处理队列队首取一单。
// Bot 必须处于可接单状态且队列非空。
func (oc *OrderController) TryAssignOrder(botID int) (Assignment, bool) {
	bot := oc.findBot(botID)
	if bot == nil || !bot.CanAcceptOrder() {
		return Assignment{}, false
	}

	order, idx, ok := oc.pending.DequeueNext()
	if !ok {
		return Assignment{}, false
	}

	bot.StartProcessing(order, idx)
	return Assignment{BotID: botID, Order: order, PickupIndex: idx}, true
}

// CompleteOrder 将 Bot 当前处理的订单移入完成列表。
// 若待处理队列仍有订单，Bot 立即取下一单；否则 Bot 转为 IDLE。
func (oc *OrderController) CompleteOrder(botID int) (Completion, bool) {
	bot := oc.findBot(botID)
	if bot == nil || !bot.IsProcessing() {
		return Completion{}, false
	}

	order := *bot.CurrentOrder
	oc.complete = append(oc.complete, order)
	bot.ClearProcessing()

	result := Completion{BotID: botID, Order: order}
	if oc.pending.Len() > 0 {
		if assign, ok := oc.TryAssignOrder(botID); ok {
			result.HasNext = true
			result.NextAssign = &assign
		}
	} else {
		bot.SetIdle()
	}

	return result, true
}

// Snapshot 返回聚合根当前状态的深拷贝快照。
func (oc *OrderController) Snapshot() Snapshot {
	return Snapshot{
		Pending:  oc.pending,
		Complete: append([]Order(nil), oc.complete...),
		Bots:     append([]Bot(nil), oc.bots...),
	}
}

// Pending 返回当前待处理队列（值拷贝）。
func (oc *OrderController) Pending() PendingQueue {
	return oc.pending
}

// CompleteIDs 返回已完成订单的 ID 列表。
func (oc *OrderController) CompleteIDs() []int {
	ids := make([]int, len(oc.complete))
	for i, o := range oc.complete {
		ids[i] = o.ID
	}
	return ids
}

// IsFullyIdle 判断系统是否完全空闲：待处理队列为空且无 Bot 正在处理。
func (oc *OrderController) IsFullyIdle() bool {
	if oc.pending.Len() > 0 {
		return false
	}
	for _, b := range oc.bots {
		if b.State == BotStateProcessing {
			return false
		}
	}
	return true
}

// findBot 按 ID 查找 Bot 指针，未找到返回 nil。
func (oc *OrderController) findBot(id int) *Bot {
	for i := range oc.bots {
		if oc.bots[i].ID == id {
			return &oc.bots[i]
		}
	}
	return nil
}
