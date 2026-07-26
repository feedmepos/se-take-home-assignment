package memory

import (
	"testing"

	"github.com/feedmepos/se-take-home-assignment/internal/domain"
)

// given 2 VIP AND 3 NORMAL AND 3 VIP
// when create() in a row
// then last createdVIP order.id is 5
// and last createdNormal is 3
func TestOrderRepo_Create_Sequence(t *testing.T) {
	repo := NewOrderRepo()

	var lastVIP, lastNormal *domain.Order

	for range 2 {
		lastVIP = repo.Create(domain.OrderTypeVIP)
	}
	for range 3 {
		lastNormal = repo.Create(domain.OrderTypeNormal)
	}
	for range 3 {
		lastVIP = repo.Create(domain.OrderTypeVIP)
	}

	if lastVIP.ID != 5 {
		t.Errorf("expected last created VIP order.ID to be 5, got %d", lastVIP.ID)
	}
	if lastNormal.ID != 3 {
		t.Errorf("expected last created Normal order.ID to be 3, got %d", lastNormal.ID)
	}
}

// given order
// when UpdateStatus to Processing
// then completedOrders len should not increase
func TestOrderRepo_UpdateStatus_Processing(t *testing.T) {
	repo := NewOrderRepo()
	order := domain.NewOrder(1, domain.OrderTypeNormal)

	repo.UpdateStatus(order, domain.OrderStatusProcessing)

	if len(repo.GetCompletedOrders(domain.OrderTypeNormal)) != 0 {
		t.Errorf("expected completedOrders len to be 0, got %d", len(repo.GetCompletedOrders(domain.OrderTypeNormal)))
	}
}

// given order
// when UpdateStatus to Complete
// then completedOrders len should increase by 1
func TestOrderRepo_UpdateStatus_Complete(t *testing.T) {
	repo := NewOrderRepo()
	order := domain.NewOrder(1, domain.OrderTypeNormal)

	countBefore := len(repo.GetCompletedOrders(domain.OrderTypeNormal))

	repo.UpdateStatus(order, domain.OrderStatusComplete)

	if len(repo.GetCompletedOrders(domain.OrderTypeNormal)) != countBefore+1 {
		t.Errorf("expected completedOrders len to be %d, got %d", countBefore+1, len(repo.GetCompletedOrders(domain.OrderTypeNormal)))
	}
}
