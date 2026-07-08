package ordercontroller

// PendingQueue 是待处理队列值对象，实现 VIP 优先的双段 FIFO 策略。
// VIP 段始终排在 Normal 段之前；各段内部保持先进先出。
type PendingQueue struct {
	VIP    []Order // VIP 订单段，FIFO
	Normal []Order // 普通订单段，FIFO
}

// Len 返回待处理队列中的订单总数。
func (q PendingQueue) Len() int {
	return len(q.VIP) + len(q.Normal)
}

// Flatten 将双段队列展平为逻辑顺序：[VIP...][Normal...]。
func (q PendingQueue) Flatten() []Order {
	out := make([]Order, 0, q.Len())
	out = append(out, q.VIP...)
	out = append(out, q.Normal...)
	return out
}

// splitByType 将逻辑队列按订单类型重新拆分为 VIP / Normal 两段。
func splitByType(logical []Order) PendingQueue {
	var q PendingQueue
	for _, o := range logical {
		if o.Type == OrderTypeVIP {
			q.VIP = append(q.VIP, o)
		} else {
			q.Normal = append(q.Normal, o)
		}
	}
	return q
}

// EnqueueNormal 将普通订单追加到 Normal 段末尾。
func (q *PendingQueue) EnqueueNormal(order Order) {
	q.Normal = append(q.Normal, order)
}

// EnqueueVIP 将 VIP 订单追加到 VIP 段末尾（位于所有 Normal 订单之前）。
func (q *PendingQueue) EnqueueVIP(order Order) {
	q.VIP = append(q.VIP, order)
}

// DequeueNext 从逻辑队首取出一单：优先 VIP 段，否则 Normal 段。
// 返回订单、取单时的 pickupIndex（0-based 逻辑索引）以及是否成功。
func (q *PendingQueue) DequeueNext() (Order, int, bool) {
	if len(q.VIP) > 0 {
		order := q.VIP[0]
		q.VIP = q.VIP[1:]
		return order, 0, true // VIP 队首的逻辑索引恒为 0
	}
	if len(q.Normal) > 0 {
		// 能走到 Normal 分支说明 VIP 段已空，队首 Normal 的逻辑索引为 0。
		idx := len(q.VIP)
		order := q.Normal[0]
		q.Normal = q.Normal[1:]
		return order, idx, true
	}
	return Order{}, 0, false
}

// ReinsertAt 将订单回插到逻辑队列的 pickupIndex 位置，再按类型拆回双段。
// 用于 Bot 被移除时恢复中断订单的原始排队位置。
func (q *PendingQueue) ReinsertAt(order Order, pickupIndex int) {
	// 先展平为逻辑队列，在 pickupIndex 处插入，再按类型拆回双段。
	logical := q.Flatten()
	if pickupIndex < 0 {
		pickupIndex = 0
	}
	if pickupIndex > len(logical) {
		pickupIndex = len(logical)
	}
	logical = append(logical[:pickupIndex], append([]Order{order}, logical[pickupIndex:]...)...)
	*q = splitByType(logical)
}

// OrderIDs 返回逻辑队列中所有订单 ID，用于日志展示。
func (q PendingQueue) OrderIDs() []int {
	flat := q.Flatten()
	ids := make([]int, len(flat))
	for i, o := range flat {
		ids[i] = o.ID
	}
	return ids
}
