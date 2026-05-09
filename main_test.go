package main

import (
	"sync"
	"testing"
	"time"
)

func TestOrderPriority(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
	}
	m.cond = sync.NewCond(&m.mu)

	// 添加普通订单和VIP订单
	normal1 := m.AddNormalOrder()
	vip1 := m.AddVipOrder()
	normal2 := m.AddNormalOrder()
	vip2 := m.AddVipOrder()

	// 获取订单，应该先VIP后普通，且VIP内部FIFO，普通内部FIFO
	// 模拟机器人获取
	order := m.GetOrder(1, nil)
	if order.ID != vip1.ID {
		t.Errorf("期望 VIP1，得到 %d", order.ID)
	}
	order = m.GetOrder(1, nil)
	if order.ID != vip2.ID {
		t.Errorf("期望 VIP2，得到 %d", order.ID)
	}
	order = m.GetOrder(1, nil)
	if order.ID != normal1.ID {
		t.Errorf("期望 Normal1，得到 %d", order.ID)
	}
	order = m.GetOrder(1, nil)
	if order.ID != normal2.ID {
		t.Errorf("期望 Normal2，得到 %d", order.ID)
	}
}

func TestReturnOrder(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
	}
	m.cond = sync.NewCond(&m.mu)

	order := m.AddNormalOrder()
	m.GetOrder(1, nil) // 取走订单
	m.ReturnOrder(1)   // 归还
	// 检查队列头部是否是刚才的订单
	m.mu.Lock()
	if len(m.normalQueue) != 1 || m.normalQueue[0].ID != order.ID {
		t.Error("归还失败，订单未正确回到队列头部")
	}
	m.mu.Unlock()
}

func TestReturnVIPOrder(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
	}
	m.cond = sync.NewCond(&m.mu)

	vipOrder := m.AddVipOrder()
	m.GetOrder(1, nil) // 取走订单
	m.ReturnOrder(1)   // 归还

	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.vipQueue) != 1 || m.vipQueue[0].ID != vipOrder.ID {
		t.Error("VIP订单归还失败，未正确回到队列头部")
	}
}

func TestCompleteOrder(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
		resultFile:  nil, // 测试时不写文件
	}
	m.cond = sync.NewCond(&m.mu)

	order := m.AddNormalOrder()
	m.GetOrder(1, nil)
	m.CompleteOrder(1)

	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.completed) != 1 || m.completed[0].ID != order.ID {
		t.Error("订单完成失败")
	}

	if _, exists := m.processing[1]; exists {
		t.Error("订单完成后仍在processing map中")
	}
}

func TestAddRobot(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
		resultFile:  nil,
	}
	m.cond = sync.NewCond(&m.mu)

	// 添加第一个机器人
	id1 := m.AddRobot()
	if id1 != 2 { // nextRobotID从1开始，AddRobot会先加1再返回
		t.Errorf("期望机器人ID 2，得到 %d", id1)
	}

	// 添加一个订单让机器人可以处理，避免阻塞影响后续测试
	m.AddNormalOrder()
	time.Sleep(50 * time.Millisecond)

	m.mu.Lock()
	if len(m.robots) != 1 {
		t.Errorf("期望1个机器人，得到 %d", len(m.robots))
	}
	if len(m.robotOrder) != 1 {
		t.Errorf("期望robotOrder长度为1，得到 %d", len(m.robotOrder))
	}
	if m.robotOrder[0] != id1 {
		t.Errorf("期望robotOrder[0]为%d，得到 %d", id1, m.robotOrder[0])
	}
	m.mu.Unlock()

	// 添加第二个机器人
	id2 := m.AddRobot()
	if id2 != 3 {
		t.Errorf("期望机器人ID 3，得到 %d", id2)
	}

	// 再添加一个订单
	m.AddVipOrder()
	time.Sleep(50 * time.Millisecond)

	m.mu.Lock()
	if len(m.robots) != 2 {
		t.Errorf("期望2个机器人，得到 %d", len(m.robots))
	}
	if len(m.robotOrder) != 2 {
		t.Errorf("期望robotOrder长度为2，得到 %d", len(m.robotOrder))
	}
	if m.robotOrder[1] != id2 {
		t.Errorf("期望robotOrder[1]为%d，得到 %d", id2, m.robotOrder[1])
	}
	m.mu.Unlock()
}

func TestRemoveRobot(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
		resultFile:  nil,
	}
	m.cond = sync.NewCond(&m.mu)

	// 先添加两个机器人
	id1 := m.AddRobot()
	id2 := m.AddRobot()

	// 验证添加成功
	m.mu.Lock()
	if len(m.robots) != 2 {
		m.mu.Unlock()
		t.Fatal("初始化机器人失败")
	}
	m.mu.Unlock()

	// 添加一些订单让机器人可以工作（避免阻塞）
	m.AddNormalOrder()
	m.AddVipOrder()

	// 等待一下让机器人开始处理订单
	time.Sleep(100 * time.Millisecond)

	// 移除最新的机器人（应该是id2）
	success := m.RemoveRobot()
	if !success {
		t.Error("移除机器人失败")
	}

	// 等待机器人完全退出
	time.Sleep(100 * time.Millisecond)

	m.mu.Lock()
	if len(m.robots) != 1 {
		t.Errorf("期望1个机器人，得到 %d", len(m.robots))
	}
	if len(m.robotOrder) != 1 {
		t.Errorf("期望robotOrder长度为1，得到 %d", len(m.robotOrder))
	}
	if _, exists := m.robots[id2]; exists {
		t.Error("机器人id2应该已被移除")
	}
	if _, exists := m.robots[id1]; !exists {
		t.Error("机器人id1应该还存在")
	}
	m.mu.Unlock()

	// 再次移除
	success = m.RemoveRobot()
	if !success {
		t.Error("第二次移除机器人失败")
	}

	time.Sleep(100 * time.Millisecond)

	m.mu.Lock()
	if len(m.robots) != 0 {
		t.Errorf("期望0个机器人，得到 %d", len(m.robots))
	}
	if len(m.robotOrder) != 0 {
		t.Errorf("期望robotOrder长度为0，得到 %d", len(m.robotOrder))
	}
	m.mu.Unlock()

	// 移除不存在的机器人（队列为空）
	success = m.RemoveRobot()
	if success {
		t.Error("当没有机器人时，RemoveRobot应该返回false")
	}
}

func TestGetState(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
		resultFile:  nil,
	}
	m.cond = sync.NewCond(&m.mu)

	// 添加订单
	normal1 := m.AddNormalOrder() // Order #1
	vip1 := m.AddVipOrder()       // Order #2

	// 添加机器人（会自动启动goroutine）
	robotID := m.AddRobot() // 这会启动一个 goroutine 运行 robot.run()

	// 等待机器人获取订单（异步操作）
	time.Sleep(100 * time.Millisecond) // 给机器人一些时间处理

	// 获取状态
	state := m.GetState()

	// 验证待处理订单（应该只有normal订单，因为vip已被取走）
	if len(state.PendingOrders) != 1 {
		t.Errorf("期望1个待处理订单，得到 %d, 订单: %+v",
			len(state.PendingOrders), state.PendingOrders)
	}

	if len(state.PendingOrders) > 0 && state.PendingOrders[0].ID != normal1.ID {
		t.Errorf("期望待处理订单为 #%d，得到 #%d", normal1.ID, state.PendingOrders[0].ID)
	}

	// 验证处理中的订单
	if len(state.Processing) != 1 {
		t.Errorf("期望1个处理中的订单，得到 %d", len(state.Processing))
	} else if len(state.Processing) > 0 && state.Processing[0] != vip1.ID {
		t.Errorf("期望处理中的订单为 #%d，得到 #%d", vip1.ID, state.Processing[0])
	}

	// 验证机器人数量
	if state.RobotCount != 1 {
		t.Errorf("期望1个机器人，得到 %d", state.RobotCount)
	}

	// 清理
	m.mu.Lock()
	if robot, ok := m.robots[robotID]; ok {
		close(robot.cancel)
	}
	m.mu.Unlock()
	time.Sleep(100 * time.Millisecond) // 等待机器人退出
}

func TestConcurrentOrderAddition(t *testing.T) {
	m := &OrderManager{
		vipQueue:    []*Order{},
		normalQueue: []*Order{},
		completed:   []*Order{},
		processing:  make(map[int]*Order),
		robots:      make(map[int]*Robot),
		robotOrder:  []int{},
		nextRobotID: 1,
		resultFile:  nil,
	}
	m.cond = sync.NewCond(&m.mu)

	var wg sync.WaitGroup
	orderCount := 100

	// 并发添加订单
	for i := 0; i < orderCount; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if i%2 == 0 {
				m.AddVipOrder()
			} else {
				m.AddNormalOrder()
			}
		}(i)
	}

	wg.Wait()

	m.mu.Lock()
	defer m.mu.Unlock()

	totalOrders := len(m.vipQueue) + len(m.normalQueue)
	if totalOrders != orderCount {
		t.Errorf("期望 %d 个订单，实际 %d 个", orderCount, totalOrders)
	}
}
