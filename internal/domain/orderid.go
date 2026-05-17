package domain

import "sync/atomic"

// OrderIDSeq 生成单调递增 OrderID（并发安全；README 要求 3）。
// 首次 Next 返回 1。
type OrderIDSeq struct {
	n atomic.Uint64
}

// Next 返回下一个订单号。
func (s *OrderIDSeq) Next() OrderID {
	v := s.n.Add(1)
	return OrderID(v)
}

// BotIDSeq 生成单调递增 BotID。
type BotIDSeq struct {
	n atomic.Uint64
}

func (s *BotIDSeq) Next() BotID {
	v := s.n.Add(1)
	return BotID(v)
}
