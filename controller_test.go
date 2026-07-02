package main

import (
	"sync"
	"testing"
	"time"
)

type MockLogger struct {
	mu   sync.Mutex
	logs []string
}

func (m *MockLogger) Logf(format string, args ...interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.logs = append(m.logs, format)
}

func TestOrderQueue_AddOrder(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	o1 := q.AddOrder(OrderTypeNormal)
	if o1.ID != 1 || o1.Type != OrderTypeNormal || o1.Status != StatusPending {
		t.Errorf("Expected Order[1]{NORMAL,PENDING}, got %v", o1)
	}

	o2 := q.AddOrder(OrderTypeVIP)
	if o2.ID != 2 || o2.Type != OrderTypeVIP || o2.Status != StatusPending {
		t.Errorf("Expected Order[2]{VIP,PENDING}, got %v", o2)
	}

	o3 := q.AddOrder(OrderTypeNormal)
	if o3.ID != 3 || o3.Type != OrderTypeNormal || o3.Status != StatusPending {
		t.Errorf("Expected Order[3]{NORMAL,PENDING}, got %v", o3)
	}

	o4 := q.AddOrder(OrderTypeVIP)
	if o4.ID != 4 || o4.Type != OrderTypeVIP || o4.Status != StatusPending {
		t.Errorf("Expected Order[4]{VIP,PENDING}, got %v", o4)
	}

	pending := q.GetPendingOrders()
	if len(pending) != 4 {
		t.Errorf("Expected 4 pending orders, got %d", len(pending))
	}

	if pending[0].Type != OrderTypeVIP || pending[0].ID != 2 {
		t.Errorf("Expected first order to be VIP[2], got %v", pending[0])
	}
	if pending[1].Type != OrderTypeVIP || pending[1].ID != 4 {
		t.Errorf("Expected second order to be VIP[4], got %v", pending[1])
	}
	if pending[2].Type != OrderTypeNormal || pending[2].ID != 1 {
		t.Errorf("Expected third order to be NORMAL[1], got %v", pending[2])
	}
	if pending[3].Type != OrderTypeNormal || pending[3].ID != 3 {
		t.Errorf("Expected fourth order to be NORMAL[3], got %v", pending[3])
	}
}

func TestOrderQueue_GetNextOrder(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	o1 := q.AddOrder(OrderTypeNormal)
	o2 := q.AddOrder(OrderTypeVIP)

	next := q.GetNextOrder()
	if next != o2 {
		t.Errorf("Expected VIP order first, got %v", next)
	}

	next = q.GetNextOrder()
	if next != o1 {
		t.Errorf("Expected NORMAL order second, got %v", next)
	}

	next = q.GetNextOrder()
	if next != nil {
		t.Errorf("Expected nil, got %v", next)
	}
}

func TestOrderQueue_CompleteOrder(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	o1 := q.AddOrder(OrderTypeNormal)
	q.GetNextOrder()
	q.CompleteOrder(o1)

	if o1.Status != StatusComplete {
		t.Errorf("Expected StatusComplete, got %v", o1.Status)
	}

	pending := q.GetPendingOrders()
	if len(pending) != 0 {
		t.Errorf("Expected 0 pending orders, got %d", len(pending))
	}

	completed := q.GetCompletedOrders()
	if len(completed) != 1 || completed[0] != o1 {
		t.Errorf("Expected 1 completed order, got %d", len(completed))
	}
}

func TestOrderQueue_PutBackOrder(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	q.AddOrder(OrderTypeNormal)
	q.AddOrder(OrderTypeVIP)

	removed := q.GetNextOrder()

	q.PutBackOrder(removed)

	pending := q.GetPendingOrders()
	if len(pending) != 2 {
		t.Errorf("Expected 2 pending orders, got %d", len(pending))
	}

	if pending[0].ID != 2 {
		t.Errorf("Expected Order[2] at position 0, got %v", pending[0])
	}
}

func TestOrderQueue_PutBackOrder_PreservesPriority(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	q.AddOrder(OrderTypeNormal)
	vip1 := q.AddOrder(OrderTypeVIP)
	q.AddOrder(OrderTypeNormal)

	removed := q.GetNextOrder()

	q.AddOrder(OrderTypeVIP)

	q.PutBackOrder(removed)

	pending := q.GetPendingOrders()
	if len(pending) != 4 {
		t.Errorf("Expected 4 pending orders, got %d", len(pending))
	}

	if pending[0].ID != vip1.ID {
		t.Errorf("Expected VIP[2] at position 0, got %v", pending[0])
	}
}

func TestRobot_WorkLoop(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	robot := NewRobot(1, q, logger)
	defer robot.Destroy()

	o1 := q.AddOrder(OrderTypeNormal)

	time.Sleep(100 * time.Millisecond)

	if robot.GetStatus() != StatusCooking {
		t.Errorf("Expected StatusCooking, got %v", robot.GetStatus())
	}

	if robot.GetCurrentOrder() != o1 {
		t.Errorf("Expected current order to be o1, got %v", robot.GetCurrentOrder())
	}
}

func TestRobot_Destroy_Interrupt(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	o1 := q.AddOrder(OrderTypeNormal)

	robot := NewRobot(1, q, logger)

	time.Sleep(100 * time.Millisecond)

	if robot.GetStatus() != StatusCooking {
		t.Errorf("Expected StatusCooking, got %v", robot.GetStatus())
	}

	robot.Destroy()

	time.Sleep(100 * time.Millisecond)

	pending := q.GetPendingOrders()
	if len(pending) != 1 || pending[0] != o1 {
		t.Errorf("Expected interrupted order back in queue, got %d orders", len(pending))
	}

	if o1.Status != StatusPending {
		t.Errorf("Expected StatusPending after interrupt, got %v", o1.Status)
	}
}

func TestRobot_IdleWhenNoOrders(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	robot := NewRobot(1, q, logger)
	defer robot.Destroy()

	time.Sleep(200 * time.Millisecond)

	if robot.GetStatus() != StatusIdle {
		t.Errorf("Expected StatusIdle, got %v", robot.GetStatus())
	}
}

func TestConcurrency_AddOrders(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	var wg sync.WaitGroup
	count := 100

	wg.Add(count)
	for i := 0; i < count; i++ {
		go func() {
			defer wg.Done()
			q.AddOrder(OrderTypeNormal)
		}()
	}
	wg.Wait()

	if q.GetPendingCount() != count {
		t.Errorf("Expected %d pending orders, got %d", count, q.GetPendingCount())
	}
}

func TestOrderID_Incrementing(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	for i := 1; i <= 10; i++ {
		o := q.AddOrder(OrderTypeNormal)
		if o.ID != i {
			t.Errorf("Expected Order ID %d, got %d", i, o.ID)
		}
	}
}

func TestOrderQueue_AddOrder_VIPPriority(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	q.AddOrder(OrderTypeNormal)
	q.AddOrder(OrderTypeNormal)
	vip1 := q.AddOrder(OrderTypeVIP)
	q.AddOrder(OrderTypeNormal)
	vip2 := q.AddOrder(OrderTypeVIP)

	pending := q.GetPendingOrders()

	if pending[0] != vip1 || pending[1] != vip2 {
		t.Errorf("Expected VIP orders first, got: %v, %v", pending[0], pending[1])
	}

	if pending[2].Type != OrderTypeNormal || pending[3].Type != OrderTypeNormal || pending[4].Type != OrderTypeNormal {
		t.Errorf("Expected normal orders after VIP, got types: %v, %v, %v", pending[2].Type, pending[3].Type, pending[4].Type)
	}
}

func TestOrderQueue_EmptyQueue_GetNextOrder(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})

	next := q.GetNextOrder()
	if next != nil {
		t.Errorf("Expected nil from empty queue, got %v", next)
	}
}

func TestRobot_MultipleRobots_Working(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	q.AddOrder(OrderTypeNormal)
	q.AddOrder(OrderTypeVIP)
	q.AddOrder(OrderTypeNormal)
	q.AddOrder(OrderTypeVIP)

	robot1 := NewRobot(1, q, logger)
	robot2 := NewRobot(2, q, logger)
	defer robot1.Destroy()
	defer robot2.Destroy()

	time.Sleep(150 * time.Millisecond)

	if robot1.GetStatus() != StatusCooking || robot2.GetStatus() != StatusCooking {
		t.Errorf("Expected both robots cooking, got: %v, %v", robot1.GetStatus(), robot2.GetStatus())
	}

	order1 := robot1.GetCurrentOrder()
	order2 := robot2.GetCurrentOrder()

	if order1 == nil || order2 == nil {
		t.Errorf("Expected both robots have orders")
	}

	if order1.Type != OrderTypeVIP && order2.Type != OrderTypeVIP {
		t.Errorf("Expected at least one robot working on VIP order")
	}
}

func TestRobot_CompleteOrder_AutoNext(t *testing.T) {
	originalCookTime := CookTime
	CookTime = 50 * time.Millisecond
	defer func() { CookTime = originalCookTime }()

	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	o1 := q.AddOrder(OrderTypeNormal)
	o2 := q.AddOrder(OrderTypeNormal)

	robot := NewRobot(1, q, logger)
	defer robot.Destroy()

	time.Sleep(80 * time.Millisecond)

	if robot.GetCurrentOrder() != o2 {
		t.Errorf("Expected robot to start next order after completion, got %v", robot.GetCurrentOrder())
	}

	if o1.Status != StatusComplete {
		t.Errorf("Expected o1 completed, got %v", o1.Status)
	}
}

func TestRobot_Destroy_Idle(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	robot := NewRobot(1, q, logger)

	time.Sleep(200 * time.Millisecond)

	if robot.GetStatus() != StatusIdle {
		t.Errorf("Expected robot idle, got %v", robot.GetStatus())
	}

	robot.Destroy()

	time.Sleep(100 * time.Millisecond)

	if robot.GetStatus() != StatusDestroyed {
		t.Errorf("Expected robot destroyed, got %v", robot.GetStatus())
	}
}

func TestRobot_Destroy_Interrupt_VIPOrder(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	vipOrder := q.AddOrder(OrderTypeVIP)
	normalOrder := q.AddOrder(OrderTypeNormal)

	robot := NewRobot(1, q, logger)

	time.Sleep(100 * time.Millisecond)

	if robot.GetCurrentOrder() != vipOrder {
		t.Errorf("Expected robot cooking VIP order, got %v", robot.GetCurrentOrder())
	}

	robot.Destroy()

	time.Sleep(100 * time.Millisecond)

	pending := q.GetPendingOrders()
	if len(pending) != 2 {
		t.Errorf("Expected 2 pending orders after interrupt, got %d", len(pending))
	}

	if pending[0] != vipOrder {
		t.Errorf("Expected interrupted VIP order at front, got %v", pending[0])
	}

	if pending[1] != normalOrder {
		t.Errorf("Expected normal order after VIP, got %v", pending[1])
	}

	if vipOrder.Status != StatusPending {
		t.Errorf("Expected VIP order status PENDING after interrupt, got %v", vipOrder.Status)
	}
}

func TestRobot_InterruptAndResume(t *testing.T) {
	originalCookTime := CookTime
	CookTime = 50 * time.Millisecond
	defer func() { CookTime = originalCookTime }()

	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	vipOrder := q.AddOrder(OrderTypeVIP)

	robot1 := NewRobot(1, q, logger)

	time.Sleep(30 * time.Millisecond)

	robot1.Destroy()

	time.Sleep(50 * time.Millisecond)

	robot2 := NewRobot(2, q, logger)
	defer robot2.Destroy()

	time.Sleep(80 * time.Millisecond)

	if vipOrder.Status != StatusComplete {
		t.Errorf("Expected VIP order completed after resume, got %v", vipOrder.Status)
	}
}

func TestConcurrency_MultipleRobots_ProcessingOrders(t *testing.T) {
	originalCookTime := CookTime
	CookTime = 30 * time.Millisecond
	defer func() { CookTime = originalCookTime }()

	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	for i := 0; i < 10; i++ {
		if i%2 == 0 {
			q.AddOrder(OrderTypeVIP)
		} else {
			q.AddOrder(OrderTypeNormal)
		}
	}

	var robots []*Robot
	for i := 0; i < 3; i++ {
		robot := NewRobot(i+1, q, logger)
		robots = append(robots, robot)
	}

	time.Sleep(150 * time.Millisecond)

	for _, robot := range robots {
		robot.Destroy()
	}

	completed := q.GetCompletedOrders()
	if len(completed) < 5 {
		t.Errorf("Expected at least 5 orders completed, got %d", len(completed))
	}

	for _, order := range completed {
		if order.Status != StatusComplete {
			t.Errorf("Expected order completed, got %v", order.Status)
		}
	}
}

func TestRobot_Destroy_Interrupt_PreservesVIPPriority(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	normal1 := q.AddOrder(OrderTypeNormal)
	vip1 := q.AddOrder(OrderTypeVIP)
	normal2 := q.AddOrder(OrderTypeNormal)

	pendingBefore := q.GetPendingOrders()
	if len(pendingBefore) != 3 {
		t.Fatalf("Expected 3 pending orders before robot, got %d", len(pendingBefore))
	}
	if pendingBefore[0] != vip1 || pendingBefore[1] != normal1 || pendingBefore[2] != normal2 {
		t.Errorf("Expected order: VIP[2], NORMAL[1], NORMAL[3], got: %v, %v, %v",
			pendingBefore[0], pendingBefore[1], pendingBefore[2])
	}

	robot := NewRobot(1, q, logger)

	time.Sleep(100 * time.Millisecond)

	if robot.GetStatus() != StatusCooking {
		t.Errorf("Expected robot cooking, got %v", robot.GetStatus())
	}
	if robot.GetCurrentOrder() != vip1 {
		t.Errorf("Expected robot cooking VIP order, got %v", robot.GetCurrentOrder())
	}

	pendingDuring := q.GetPendingOrders()
	if len(pendingDuring) != 2 {
		t.Errorf("Expected 2 pending orders during cooking, got %d", len(pendingDuring))
	}

	robot.Destroy()

	pendingAfter := q.GetPendingOrders()
	if len(pendingAfter) != 3 {
		t.Errorf("Expected 3 pending orders after interrupt, got %d", len(pendingAfter))
	}

	if pendingAfter[0] != vip1 {
		t.Errorf("Expected interrupted VIP order at front, got %v", pendingAfter[0])
	}
	if pendingAfter[1] != normal1 {
		t.Errorf("Expected normal1 after VIP, got %v", pendingAfter[1])
	}
	if pendingAfter[2] != normal2 {
		t.Errorf("Expected normal2 at end, got %v", pendingAfter[2])
	}

	if vip1.Status != StatusPending {
		t.Errorf("Expected VIP order status PENDING after interrupt, got %v", vip1.Status)
	}

	if robot.GetStatus() != StatusDestroyed {
		t.Errorf("Expected robot status DESTROYED, got %v", robot.GetStatus())
	}
}

func TestRobot_Destroy_Interrupt_MultipleRobots(t *testing.T) {
	q := NewOrderQueue(&MockLogger{})
	logger := &MockLogger{}

	vip1 := q.AddOrder(OrderTypeVIP)
	vip2 := q.AddOrder(OrderTypeVIP)
	normal1 := q.AddOrder(OrderTypeNormal)
	normal2 := q.AddOrder(OrderTypeNormal)

	robot1 := NewRobot(1, q, logger)
	robot2 := NewRobot(2, q, logger)

	time.Sleep(100 * time.Millisecond)

	order1 := robot1.GetCurrentOrder()
	order2 := robot2.GetCurrentOrder()

	if order1 == nil || order2 == nil {
		t.Fatal("Expected both robots to have orders")
	}

	if order1 == order2 {
		t.Errorf("Expected different orders for each robot, both got %v", order1)
	}

	if order1.Type != OrderTypeVIP || order2.Type != OrderTypeVIP {
		t.Errorf("Expected both robots to process VIP orders, got %v and %v", order1.Type, order2.Type)
	}

	robot1.Destroy()

	pendingAfterDestroy := q.GetPendingOrders()
	if len(pendingAfterDestroy) != 3 {
		t.Errorf("Expected 3 pending orders after destroying one robot, got %d", len(pendingAfterDestroy))
	}

	if pendingAfterDestroy[0].Type != OrderTypeVIP {
		t.Errorf("Expected interrupted VIP order at front, got %v", pendingAfterDestroy[0])
	}

	robot2.Destroy()

	pendingAfterAllDestroy := q.GetPendingOrders()
	if len(pendingAfterAllDestroy) != 4 {
		t.Errorf("Expected 4 pending orders after destroying all robots, got %d", len(pendingAfterAllDestroy))
	}

	if pendingAfterAllDestroy[0].Type != OrderTypeVIP || pendingAfterAllDestroy[1].Type != OrderTypeVIP {
		t.Errorf("Expected VIP orders at front, got %v, %v", pendingAfterAllDestroy[0].Type, pendingAfterAllDestroy[1].Type)
	}

	if pendingAfterAllDestroy[2].Type != OrderTypeNormal || pendingAfterAllDestroy[3].Type != OrderTypeNormal {
		t.Errorf("Expected normal orders after VIP, got %v, %v", pendingAfterAllDestroy[2].Type, pendingAfterAllDestroy[3].Type)
	}

	foundVip1 := false
	foundVip2 := false
	foundNormal1 := false
	foundNormal2 := false
	for _, order := range pendingAfterAllDestroy {
		if order == vip1 {
			foundVip1 = true
		}
		if order == vip2 {
			foundVip2 = true
		}
		if order == normal1 {
			foundNormal1 = true
		}
		if order == normal2 {
			foundNormal2 = true
		}
	}

	if !foundVip1 || !foundVip2 || !foundNormal1 || !foundNormal2 {
		t.Errorf("Not all original orders found in pending queue after all robots destroyed")
	}
}
