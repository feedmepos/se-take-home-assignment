package queue

import (
	"testing"

	"github.com/dnisting/se-take-home-assignment/internal/models"
)

func newOrder(id int, orderType models.OrderType) *models.Order {
	return &models.Order{ID: id, Type: orderType, Status: models.OrderStatusPending}
}

func TestNormalOrderFIFO(t *testing.T) {
	q := NewOrderQueue()
	q.Enqueue(newOrder(1, models.OrderTypeNormal))
	q.Enqueue(newOrder(2, models.OrderTypeNormal))
	q.Enqueue(newOrder(3, models.OrderTypeNormal))

	o1 := q.Dequeue()
	o2 := q.Dequeue()
	o3 := q.Dequeue()

	if o1.ID != 1 || o2.ID != 2 || o3.ID != 3 {
		t.Errorf("expected FIFO order 1,2,3 but got %d,%d,%d", o1.ID, o2.ID, o3.ID)
	}
}

func TestVIPPriorityInsertion(t *testing.T) {
	q := NewOrderQueue()
	q.Enqueue(newOrder(1, models.OrderTypeNormal))
	q.Enqueue(newOrder(2, models.OrderTypeNormal))
	q.Enqueue(newOrder(3, models.OrderTypeVIP))

	o := q.Dequeue()
	if o.ID != 3 {
		t.Errorf("expected VIP order 3 first, got %d", o.ID)
	}

	o = q.Dequeue()
	if o.ID != 1 {
		t.Errorf("expected Normal order 1 second, got %d", o.ID)
	}
}

func TestVIPBehindExistingVIP(t *testing.T) {
	q := NewOrderQueue()
	q.Enqueue(newOrder(1, models.OrderTypeNormal))
	q.Enqueue(newOrder(2, models.OrderTypeVIP))
	q.Enqueue(newOrder(3, models.OrderTypeVIP))

	o1 := q.Dequeue()
	o2 := q.Dequeue()
	o3 := q.Dequeue()

	if o1.ID != 2 {
		t.Errorf("expected VIP order 2 first, got %d", o1.ID)
	}
	if o2.ID != 3 {
		t.Errorf("expected VIP order 3 second, got %d", o2.ID)
	}
	if o3.ID != 1 {
		t.Errorf("expected Normal order 1 third, got %d", o3.ID)
	}
}

func TestEnqueueFront(t *testing.T) {
	q := NewOrderQueue()
	q.Enqueue(newOrder(1, models.OrderTypeNormal))
	q.Enqueue(newOrder(2, models.OrderTypeNormal))
	q.EnqueueFront(newOrder(3, models.OrderTypeNormal))

	o := q.Dequeue()
	if o.ID != 3 {
		t.Errorf("expected front-enqueued order 3 first, got %d", o.ID)
	}
}

func TestDequeueEmpty(t *testing.T) {
	q := NewOrderQueue()
	o := q.Dequeue()
	if o != nil {
		t.Errorf("expected nil from empty queue, got %v", o)
	}
}

func TestLen(t *testing.T) {
	q := NewOrderQueue()
	if q.Len() != 0 {
		t.Errorf("expected len 0, got %d", q.Len())
	}
	q.Enqueue(newOrder(1, models.OrderTypeNormal))
	q.Enqueue(newOrder(2, models.OrderTypeVIP))
	if q.Len() != 2 {
		t.Errorf("expected len 2, got %d", q.Len())
	}
	q.Dequeue()
	if q.Len() != 1 {
		t.Errorf("expected len 1, got %d", q.Len())
	}
}

func TestMixedOrderScenario(t *testing.T) {
	q := NewOrderQueue()
	q.Enqueue(newOrder(1001, models.OrderTypeNormal))
	q.Enqueue(newOrder(1002, models.OrderTypeVIP))
	q.Enqueue(newOrder(1003, models.OrderTypeNormal))
	q.Enqueue(newOrder(1004, models.OrderTypeVIP))

	expected := []int{1002, 1004, 1001, 1003}
	for i, expID := range expected {
		o := q.Dequeue()
		if o == nil {
			t.Fatalf("dequeue %d: expected order %d, got nil", i, expID)
		}
		if o.ID != expID {
			t.Errorf("dequeue %d: expected order %d, got %d", i, expID, o.ID)
		}
	}
}
