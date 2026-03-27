package orderManager

import (
	"context"
	"fmt"
	"mcd/pkg/constant"
	"mcd/pkg/model/order"
	"mcd/pkg/util"
	"strconv"
	"sync"
)

type OrderManager struct {
	NormalOrder    []*order.Order
	VIPOrder       []*order.Order
	CompletedOrder []*order.Order
	orderMap       map[int]*order.Order
	mu             sync.Mutex
	notifyCh       chan struct{}
	pendingCount   int
}

func NewOrderManager() *OrderManager {
	return &OrderManager{
		NormalOrder:  make([]*order.Order, 0, 10),
		VIPOrder:     make([]*order.Order, 0, 10),
		orderMap:     make(map[int]*order.Order), // for quick lookup
		notifyCh:     make(chan struct{}, 1),
		pendingCount: 0,
	}
}

func (om *OrderManager) CompleteOrder(orderID int) {
	om.mu.Lock()
	defer om.mu.Unlock()

	item, ok := om.orderMap[orderID]
	if !ok {
		return
	}

	if item.Type == order.TypeVIP {
		for i, order := range om.VIPOrder {
			if order.ID == orderID {
				copy(om.VIPOrder[i:], om.VIPOrder[i+1:])
				om.VIPOrder = om.VIPOrder[:len(om.VIPOrder)-1]
				break
			}
		}
	} else {
		for i, order := range om.NormalOrder {
			if order.ID == orderID {
				copy(om.NormalOrder[i:], om.NormalOrder[i+1:])
				om.NormalOrder = om.NormalOrder[:len(om.NormalOrder)-1]
				break
			}
		}
	}

	// complete order
	item.Complete()
	om.CompletedOrder = append(om.CompletedOrder, item)
	delete(om.orderMap, orderID)
}

func (om *OrderManager) Add(orderType string) {
	om.mu.Lock()
	defer om.mu.Unlock()

	switch orderType {
	case "Normal":
		order := order.NewOrder(order.TypeNormal)
		om.NormalOrder = append(om.NormalOrder, order)
		om.orderMap[order.ID] = order
		om.pendingCount++
	case "VIP":
		order := order.NewOrder(order.TypeVIP)
		om.VIPOrder = append(om.VIPOrder, order)
		om.orderMap[order.ID] = order
		om.pendingCount++
	default:
		util.Log("Invalid order type: %s", orderType)
		return
	}

	select {
	case om.notifyCh <- struct{}{}:
	default:
	}
}

func (om *OrderManager) TakeOrder(ctx context.Context) (*order.Order, error) {
	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		om.mu.Lock()
		ord := om.findPendingOrder()
		if ord != nil {
			ord.Status = order.StatusProcessing
			om.pendingCount--
			om.mu.Unlock()
			return ord, nil
		}
		om.mu.Unlock()

		select {
		case <-om.notifyCh:
			continue
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
}

func (om *OrderManager) List() {
	fmt.Printf("%-10s %-8s %-10s %-25s %-25s\n", "Order ID", "Type", "Status", "Created At", "Completed At")
	for _, order := range om.VIPOrder {
		fmt.Printf("%-10s %-8s %-10s %-25s %-25s\n", "#"+strconv.Itoa(order.ID), string(order.Type), string(order.Status), order.CreateAt.Format(constant.AT_FORMAT), order.CompleteAt.Format(constant.AT_FORMAT))
	}

	for _, order := range om.NormalOrder {
		fmt.Printf("%-10s %-8s %-10s %-25s %-25s\n", "#"+strconv.Itoa(order.ID), string(order.Type), string(order.Status), order.CreateAt.Format(constant.AT_FORMAT), order.CompleteAt.Format(constant.AT_FORMAT))
	}

	for _, order := range om.CompletedOrder {
		fmt.Printf("%-10s %-8s %-10s %-25s %-25s\n", "#"+strconv.Itoa(order.ID), string(order.Type), string(order.Status), order.CreateAt.Format(constant.AT_FORMAT), order.CompleteAt.Format(constant.AT_FORMAT))
	}
}

func (om *OrderManager) findPendingOrder() *order.Order {
	for _, item := range om.VIPOrder {
		if item.Status == order.StatusPending {
			return item
		}
	}
	for _, item := range om.NormalOrder {
		if item.Status == order.StatusPending {
			return item
		}
	}
	return nil
}

func (om *OrderManager) GetPendingCount() int {
	om.mu.Lock()
	defer om.mu.Unlock()

	return om.pendingCount
}

func (om *OrderManager) ResetOrder(orderID int) {
	om.mu.Lock()
	defer om.mu.Unlock()

	item, ok := om.orderMap[orderID]
	if !ok {
		return
	}

	// only reset order if it's processing
	if item.Status == order.StatusProcessing {
		item.Status = order.StatusPending
		om.pendingCount++
	}
}
