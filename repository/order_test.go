package repository

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/models"
)

func TestOrderPoolMemory_GenerateID(t *testing.T) {
	pool := &OrderPoolMemory{
		currentOrderID: 0,
	}
	ctx := context.Background()

	id1 := pool.GenerateID(ctx)
	if id1 != 1 {
		t.Errorf("期望第一个ID为1，实际得到 %d", id1)
	}

	id2 := pool.GenerateID(ctx)
	if id2 != 2 {
		t.Errorf("期望第二个ID为2，实际得到 %d", id2)
	}
}

func TestOrderPoolMemory_CreatePending(t *testing.T) {
	// 为每个测试初始化一个新的存储库
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 测试创建普通优先级订单
	customerID := int64(1001)
	order, err := pool.CreatePending(ctx, customerID, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建普通订单失败: %v", err)
	}
	if order.CustomerID != customerID {
		t.Errorf("期望客户ID为 %d，实际得到 %d", customerID, order.CustomerID)
	}
	if order.Priority != consts.OrderPriorityNormal {
		t.Errorf("期望优先级为 %d，实际得到 %d", consts.OrderPriorityNormal, order.Priority)
	}
	if order.Status != consts.OrderStatusPending {
		t.Errorf("期望状态为 %d，实际得到 %d", consts.OrderStatusPending, order.Status)
	}
	if pool.NormalPendingOrders.Len() != 1 {
		t.Errorf("期望有1个普通待处理订单，实际有 %d", pool.NormalPendingOrders.Len())
	}

	// 测试创建VIP优先级订单
	vipCustomerID := int64(2001)
	vipOrder, err := pool.CreatePending(ctx, vipCustomerID, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("创建VIP订单失败: %v", err)
	}
	if vipOrder.CustomerID != vipCustomerID {
		t.Errorf("期望客户ID为 %d，实际得到 %d", vipCustomerID, vipOrder.CustomerID)
	}
	if vipOrder.Priority != consts.OrderPriorityVip {
		t.Errorf("期望优先级为 %d，实际得到 %d", consts.OrderPriorityVip, vipOrder.Priority)
	}
	if pool.VipPendingOrders.Len() != 1 {
		t.Errorf("期望有1个VIP待处理订单，实际有 %d", pool.VipPendingOrders.Len())
	}
}

func TestOrderPoolMemory_HasVipPending(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 初始应该没有VIP订单
	if pool.HasVipPending(ctx) {
		t.Error("期望初始没有VIP订单")
	}

	// 添加一个VIP订单
	_, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("创建VIP订单失败: %v", err)
	}

	// 现在应该有一个VIP订单
	if !pool.HasVipPending(ctx) {
		t.Error("添加VIP订单后期望有VIP订单")
	}
}

func TestOrderPoolMemory_TakePending(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 创建一个普通订单
	normalOrder, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建普通订单失败: %v", err)
	}

	// 创建一个VIP订单
	vipOrder, err := pool.CreatePending(ctx, 2001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("创建VIP订单失败: %v", err)
	}

	// 取出VIP订单
	takenVipOrder, err := pool.TakePending(ctx, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("取出VIP订单失败: %v", err)
	}
	if takenVipOrder.ID != vipOrder.ID {
		t.Errorf("期望VIP订单ID为 %d，实际得到 %d", vipOrder.ID, takenVipOrder.ID)
	}
	if pool.VipPendingOrders.Len() != 0 {
		t.Errorf("取出一个VIP订单后期望有0个VIP待处理订单，实际有 %d", pool.VipPendingOrders.Len())
	}

	// 取出普通订单
	takenNormalOrder, err := pool.TakePending(ctx, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("取出普通订单失败: %v", err)
	}
	if takenNormalOrder.ID != normalOrder.ID {
		t.Errorf("期望普通订单ID为 %d，实际得到 %d", normalOrder.ID, takenNormalOrder.ID)
	}
	if pool.NormalPendingOrders.Len() != 0 {
		t.Errorf("取出一个普通订单后期望有0个普通待处理订单，实际有 %d", pool.NormalPendingOrders.Len())
	}
}

func TestOrderPoolMemory_FindByID(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 创建一个订单
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 通过ID查找订单
	foundOrder, err := pool.FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}
	if foundOrder == nil {
		t.Fatal("期望找到订单，实际得到nil")
	}
	if foundOrder.ID != order.ID {
		t.Errorf("期望订单ID为 %d，实际得到 %d", order.ID, foundOrder.ID)
	}

	// 尝试查找不存在的订单
	nonExistentOrder, err := pool.FindByID(ctx, 9999)
	if err != nil {
		t.Fatalf("查找不存在订单时出现意外错误: %v", err)
	}
	if nonExistentOrder != nil {
		t.Errorf("期望不存在订单返回nil，实际得到 %+v", nonExistentOrder)
	}
}

func TestOrderPoolMemory_ChangeStatusToProcessing(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 创建一个订单
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 创建一个机器人
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 将订单状态改为处理中
	err = pool.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	if order.Status != consts.OrderStatusProcessing {
		t.Errorf("期望订单状态为 %d，实际得到 %d", consts.OrderStatusProcessing, order.Status)
	}
	if order.BotID != bot.ID {
		t.Errorf("期望订单机器人ID为 %d，实际得到 %d", bot.ID, order.BotID)
	}
}

func TestOrderPoolMemory_ChangeStatusToCompleted(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 创建一个订单
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 创建一个机器人
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 先将订单状态改为处理中
	err = pool.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	// 将订单状态改为已完成
	err = pool.ChangeStatusToCompleted(ctx, order)
	if err != nil {
		t.Fatalf("将订单状态改为已完成失败: %v", err)
	}

	if order.Status != consts.OrderStatusCompleted {
		t.Errorf("期望订单状态为 %d，实际得到 %d", consts.OrderStatusCompleted, order.Status)
	}

	// 验证订单是否在已完成订单列表中
	if len(pool.CompletedOrders) != 1 {
		t.Errorf("期望有1个已完成订单，实际有 %d", len(pool.CompletedOrders))
	}
}

func TestOrderPoolMemory_ChangeStatusFromProcessingToPending(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 创建一个订单
	order, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 创建一个机器人
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 从待处理队列中取出订单
	_, err = pool.TakePending(ctx, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("取出待处理订单失败: %v", err)
	}

	// 将订单状态改为处理中
	err = pool.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	// 将订单状态从处理中改回待处理
	err = pool.ChangeStatusFromProcessingToPending(ctx, order)
	if err != nil {
		t.Fatalf("将订单状态从处理中改回待处理失败: %v", err)
	}

	if order.Status != consts.OrderStatusPending {
		t.Errorf("期望订单状态为 %d，实际得到 %d", consts.OrderStatusPending, order.Status)
	}
	if order.BotID != 0 {
		t.Errorf("期望订单机器人ID为0，实际得到 %d", order.BotID)
	}

	// 验证订单是否回到待处理订单列表
	if pool.NormalPendingOrders.Len() != 1 {
		t.Errorf("期望有1个普通待处理订单，实际有 %d", pool.NormalPendingOrders.Len())
	}
}

func TestOrderPoolMemory_FetchUncompleted(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 创建两个订单
	order1, err := pool.CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单1失败: %v", err)
	}

	order2, err := pool.CreatePending(ctx, 1002, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("创建订单2失败: %v", err)
	}

	if order2 == nil {
		t.Fatalf("创建订单2失败")
	}

	// 创建一个机器人
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 将订单1状态改为处理中
	err = pool.ChangeStatusToProcessing(ctx, order1, bot)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	// 获取未完成的订单
	uncompleted, err := pool.FetchUncompleted(ctx)
	if err != nil {
		t.Fatalf("获取未完成订单失败: %v", err)
	}

	if len(uncompleted) != 2 {
		t.Errorf("期望有2个未完成订单，实际有 %d", len(uncompleted))
	}

	// 完成订单1
	err = pool.ChangeStatusToCompleted(ctx, order1)
	if err != nil {
		t.Fatalf("将订单状态改为已完成失败: %v", err)
	}

	// 再次获取未完成的订单
	uncompleted, err = pool.FetchUncompleted(ctx)
	if err != nil {
		t.Fatalf("获取未完成订单失败: %v", err)
	}

	if len(uncompleted) != 1 {
		t.Errorf("完成一个订单后期望有1个未完成订单，实际有 %d", len(uncompleted))
	}
}

func TestOrderPoolMemory_FetchRecentCompleted(t *testing.T) {
	InitOrderRepository()
	pool := orderStoragePtr.(*OrderPoolMemory)
	ctx := context.Background()

	// 创建三个订单
	orders := make([]*models.Order, 3)
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	for i := 0; i < 3; i++ {
		order, err := pool.CreatePending(ctx, int64(1001+i), consts.OrderPriorityNormal)
		if err != nil {
			t.Fatalf("创建订单%d失败: %v", i+1, err)
		}
		orders[i] = order

		// 从待处理队列中取出订单
		_, err = pool.TakePending(ctx, consts.OrderPriorityNormal)
		if err != nil {
			t.Fatalf("取出待处理订单%d失败: %v", i+1, err)
		}

		// 改为处理中
		err = pool.ChangeStatusToProcessing(ctx, order, bot)
		if err != nil {
			t.Fatalf("将订单%d状态改为处理中失败: %v", i+1, err)
		}

		// 完成订单
		err = pool.ChangeStatusToCompleted(ctx, order)
		if err != nil {
			t.Fatalf("将订单%d状态改为已完成失败: %v", i+1, err)
		}
	}

	// 获取最近的2个已完成订单
	completed, err := pool.FetchRecentCompleted(ctx, 2)
	if err != nil {
		t.Fatalf("获取最近已完成订单失败: %v", err)
	}

	if len(completed) != 2 {
		t.Errorf("期望有2个最近已完成订单，实际有 %d", len(completed))
	}

	// 最近的订单应该是最后创建的那些
	if completed[0].ID != orders[1].ID {
		t.Errorf("期望第一个最近订单ID为 %d，实际得到 %d", orders[1].ID, completed[0].ID)
	}
	if completed[1].ID != orders[2].ID {
		t.Errorf("期望第二个最近订单ID为 %d，实际得到 %d", orders[2].ID, completed[1].ID)
	}
}
