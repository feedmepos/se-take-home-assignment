package domain

// VIPAppendIndex 新 VIP 单在 VIP 子队列末尾的下标（README：在已有 VIP 之后）。
func VIPAppendIndex(vipQueueLen int) int {
	if vipQueueLen < 0 {
		return 0
	}
	return vipQueueLen
}

// NormalAppendIndex 新 Normal 单在 Normal 子队列末尾的下标。
func NormalAppendIndex(normalQueueLen int) int {
	if normalQueueLen < 0 {
		return 0
	}
	return normalQueueLen
}

// DequeuePeek 下一单从哪条子队列头部取出：先 VIP，再 Normal。
func DequeuePeek(vipLen, normalLen int) (fromVIP bool, ok bool) {
	if vipLen > 0 {
		return true, true
	}
	if normalLen > 0 {
		return false, true
	}
	return false, false
}

// RequeueInsertIndex 将订单插回同级 pending 时使用的下标：原下标，夹在 [0, currentTierLen]。
// currentTierLen 为回插时刻该子队列长度（不含本单）。
func RequeueInsertIndex(currentTierLen, originalIndex int) int {
	if originalIndex < 0 {
		return 0
	}
	if originalIndex > currentTierLen {
		return currentTierLen
	}
	return originalIndex
}
