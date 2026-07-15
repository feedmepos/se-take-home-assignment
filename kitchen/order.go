package kitchen

// OrderType 区分普通订单与 VIP 订单。VIP 在待处理队列中享有优先级。
type OrderType int

const (
	Normal OrderType = iota // 普通会员订单
	VIP                     // VIP 会员订单，优先处理
)

func (t OrderType) String() string {
	if t == VIP {
		return "VIP"
	}
	return "Normal"
}

// Status 表示订单当前所处的区域。
type Status int

const (
	Pending  Status = iota // 待处理区
	Complete               // 已完成区
)

func (s Status) String() string {
	if s == Complete {
		return "COMPLETE"
	}
	return "PENDING"
}

// Order 是一张订单。ID 全局唯一且自增。
type Order struct {
	ID   int
	Type OrderType
}

// higherPriority 判断 a 是否应排在 b 之前。
// 规则：VIP 先于普通；同类型按下单顺序（ID 小的在前）。
// 由于 ID 单调递增，被抢占的订单退回队列时，用同样的规则重新入队
// 即可自动回到它原本的相对位置——无需额外记录下标。
func higherPriority(a, b *Order) bool {
	if a.Type != b.Type {
		return a.Type == VIP
	}
	return a.ID < b.ID
}
