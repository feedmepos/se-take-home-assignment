package order

// InsertPending inserts o into pending by VIP-before-Normal rules.
// VIP: after all existing VIPs, before first Normal.
// Normal: append to tail.
func InsertPending(pending []*Order, o *Order) []*Order {
	if o.Type == TypeNormal {
		return append(pending, o)
	}
	idx := 0
	for idx < len(pending) && pending[idx].Type == TypeVIP {
		idx++
	}
	pending = append(pending, nil)
	copy(pending[idx+1:], pending[idx:])
	pending[idx] = o
	return pending
}
