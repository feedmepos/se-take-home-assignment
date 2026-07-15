package kitchen

// BotView 是某台机器人的只读状态快照。
type BotView struct {
	ID        int
	Cooking   int // 正在烹饪的订单号，0 表示空闲
	IsCooking bool
}

// Snapshot 是控制器某一时刻的只读状态，供展示与测试断言使用。
type Snapshot struct {
	Pending  []Order
	Complete []Order
	Bots     []BotView
}

// Snapshot 返回当前状态的一致性快照（加锁读取）。
func (c *Controller) Snapshot() Snapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	s := Snapshot{
		Pending:  make([]Order, 0, len(c.pending)),
		Complete: make([]Order, 0, len(c.complete)),
		Bots:     make([]BotView, 0, len(c.bots)),
	}
	for _, o := range c.pending {
		s.Pending = append(s.Pending, *o)
	}
	for _, o := range c.complete {
		s.Complete = append(s.Complete, *o)
	}
	for _, b := range c.bots {
		v := BotView{ID: b.id}
		if b.current != nil {
			v.Cooking = b.current.ID
			v.IsCooking = true
		}
		s.Bots = append(s.Bots, v)
	}
	return s
}

// PendingIDs 是便捷方法，返回待处理区订单号（按优先级顺序）。
func (s Snapshot) PendingIDs() []int  { return ids(s.Pending) }
func (s Snapshot) CompleteIDs() []int { return ids(s.Complete) }

func ids(os []Order) []int {
	out := make([]int, len(os))
	for i, o := range os {
		out[i] = o.ID
	}
	return out
}
