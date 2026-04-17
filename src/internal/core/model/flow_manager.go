package model

type FlowManager struct {
	pendingVIP    []*Order
	pendingNormal []*Order
	complete      []*Order
}

func NewFlowManager() *FlowManager {
	return &FlowManager{
		pendingVIP:    []*Order{},
		pendingNormal: []*Order{},
		complete:      []*Order{},
	}
}

func (f *FlowManager) Enqueue(order *Order) {
	order.SetStatus(OrderStatusPending)
	if order.Priority() == PriorityVIP {
		f.pendingVIP = append(f.pendingVIP, order)
		return
	}
	f.pendingNormal = append(f.pendingNormal, order)
}

func (f *FlowManager) Requeue(order *Order) {
	order.SetStatus(OrderStatusPending)

	if order.Priority() == PriorityVIP {
		f.pendingVIP = append([]*Order{order}, f.pendingVIP...)
		return
	}

	f.pendingNormal = append([]*Order{order}, f.pendingNormal...)
}

func (f *FlowManager) NextPending() (*Order, bool) {
	if len(f.pendingVIP) > 0 {
		order := f.pendingVIP[0]
		f.pendingVIP = f.pendingVIP[1:]
		return order, true
	}
	if len(f.pendingNormal) > 0 {
		order := f.pendingNormal[0]
		f.pendingNormal = f.pendingNormal[1:]
		return order, true
	}
	return nil, false
}

func (f *FlowManager) Complete(order *Order) {
	order.SetStatus(OrderStatusComplete)
	f.complete = append(f.complete, order)
}

func (f *FlowManager) PendingVIP() []*Order {
	return f.pendingVIP
}

func (f *FlowManager) PendingNormal() []*Order {
	return f.pendingNormal
}

func (f *FlowManager) CompleteOrders() []*Order {
	return f.complete
}
