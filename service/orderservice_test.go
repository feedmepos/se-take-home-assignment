package service

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/repository"
)

func initOrder() {
	// 初始化存储库
	repository.InitOrderRepository()
	// 初始化服务
	InitOrderService()
}

func TestOrderServiceImpl_Create(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 测试创建普通优先级订单
	customerID := int64(1001)
	orderID, err := service.Create(ctx, customerID, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建普通订单失败: %v", err)
	}
	if orderID <= 0 {
		t.Errorf("期望订单ID大于0，实际得到 %d", orderID)
	}

	// 测试创建VIP优先级订单
	vipCustomerID := int64(2001)
	vipOrderID, err := service.Create(ctx, vipCustomerID, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("创建VIP订单失败: %v", err)
	}
	if vipOrderID <= 0 {
		t.Errorf("期望VIP订单ID大于0，实际得到 %d", vipOrderID)
	}

	// 测试创建无效优先级订单
	invalidOrderID, err := service.Create(ctx, customerID, consts.OrderPriority(999))
	if err != errdef.ErrOrderPriorityInvalid {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrOrderPriorityInvalid, err)
	}
	if invalidOrderID != 0 {
		t.Errorf("期望无效订单ID为0，实际得到 %d", invalidOrderID)
	}
}

func TestOrderServiceImpl_FindByID(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 创建一个订单
	customerID := int64(1001)
	orderID, err := service.Create(ctx, customerID, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 通过ID查找订单
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}
	if order == nil {
		t.Fatal("期望找到订单，实际得到nil")
	}
	if order.ID != orderID {
		t.Errorf("期望订单ID为 %d，实际得到 %d", orderID, order.ID)
	}
	if order.CustomerID != customerID {
		t.Errorf("期望客户ID为 %d，实际得到 %d", customerID, order.CustomerID)
	}

	// 尝试查找不存在的订单
	nonExistentOrder, err := service.FindByID(ctx, 9999)
	if err != nil {
		t.Fatalf("查找不存在订单时出现意外错误: %v", err)
	}
	if nonExistentOrder != nil {
		t.Errorf("期望不存在订单返回nil，实际得到 %+v", nonExistentOrder)
	}
}

func TestOrderServiceImpl_FindUncompleted(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 初始应该没有未完成订单
	uncompleted, err := service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("查找未完成订单失败: %v", err)
	}
	if len(uncompleted) != 0 {
		t.Errorf("期望初始没有未完成订单，实际有 %d", len(uncompleted))
	}

	// 创建两个订单
	_, err = service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建普通订单失败: %v", err)
	}

	_, err = service.Create(ctx, 2001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("创建VIP订单失败: %v", err)
	}

	// 查找未完成订单
	uncompleted, err = service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("查找未完成订单失败: %v", err)
	}
	if len(uncompleted) != 2 {
		t.Errorf("期望有2个未完成订单，实际有 %d", len(uncompleted))
	}
}

func TestOrderServiceImpl_FindRecentCompleted(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 初始应该没有已完成订单
	completed, err := service.FindRecentCompleted(ctx, 10)
	if err != nil {
		t.Fatalf("查找已完成订单失败: %v", err)
	}
	if len(completed) != 0 {
		t.Errorf("期望初始没有已完成订单，实际有 %d", len(completed))
	}

	// 创建三个订单并完成它们
	orderIDs := make([]int64, 3)
	for i := 0; i < 3; i++ {
		orderID, err := service.Create(ctx, int64(1001+i), consts.OrderPriorityNormal)
		if err != nil {
			t.Fatalf("创建订单%d失败: %v", i+1, err)
		}
		orderIDs[i] = orderID

		// 获取订单对象
		order, err := service.FindByID(ctx, orderID)
		if err != nil {
			t.Fatalf("查找订单%d失败: %v", i+1, err)
		}

		// 创建一个机器人
		bot := &models.Bot{
			ID:     int64(i + 1),
			Status: consts.BotStatusIdle,
		}

		// 将订单状态改为处理中
		err = service.ChangeStatusToProcessing(ctx, order, bot)
		if err != nil {
			t.Fatalf("将订单%d状态改为处理中失败: %v", i+1, err)
		}

		// 将订单状态改为已完成
		err = service.ChangeStatusToCompleted(ctx, order)
		if err != nil {
			t.Fatalf("将订单%d状态改为已完成失败: %v", i+1, err)
		}
	}

	// 查找最近的2个已完成订单
	completed, err = service.FindRecentCompleted(ctx, 2)
	if err != nil {
		t.Fatalf("查找已完成订单失败: %v", err)
	}
	if len(completed) != 2 {
		t.Errorf("期望有2个已完成订单，实际有 %d", len(completed))
	}

	// 验证最近的订单是最后创建的那些
	if completed[0].ID != orderIDs[1] {
		t.Errorf("期望第一个最近订单ID为 %d，实际得到 %d", orderIDs[1], completed[0].ID)
	}
	if completed[1].ID != orderIDs[2] {
		t.Errorf("期望第二个最近订单ID为 %d，实际得到 %d", orderIDs[2], completed[1].ID)
	}
}

func TestOrderServiceImpl_ChangeStatusToProcessing(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 创建一个订单
	orderID, err := service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 获取订单对象
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}

	// 创建一个机器人
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 将订单状态改为处理中
	err = service.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	if order.Status != consts.OrderStatusProcessing {
		t.Errorf("期望订单状态为处理中(%d)，实际得到 %d", consts.OrderStatusProcessing, order.Status)
	}
	if order.BotID != bot.ID {
		t.Errorf("期望订单机器人ID为 %d，实际得到 %d", bot.ID, order.BotID)
	}

	// 测试nil订单
	err = service.ChangeStatusToProcessing(ctx, nil, bot)
	if err != errdef.ErrOrderNotFound {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrOrderNotFound, err)
	}

	// 测试nil机器人
	err = service.ChangeStatusToProcessing(ctx, order, nil)
	if err != errdef.ErrBotNotFound {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrBotNotFound, err)
	}
}

func TestOrderServiceImpl_ChangeStatusToCompleted(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 创建一个订单
	orderID, err := service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 获取订单对象
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}

	// 创建一个机器人
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 先将订单状态改为处理中
	err = service.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	// 将订单状态改为已完成
	err = service.ChangeStatusToCompleted(ctx, order)
	if err != nil {
		t.Fatalf("将订单状态改为已完成失败: %v", err)
	}

	if order.Status != consts.OrderStatusCompleted {
		t.Errorf("期望订单状态为已完成(%d)，实际得到 %d", consts.OrderStatusCompleted, order.Status)
	}

	// 测试nil订单
	err = service.ChangeStatusToCompleted(ctx, nil)
	if err != errdef.ErrOrderNotFound {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrOrderNotFound, err)
	}

	// 测试状态不匹配的订单
	newOrder, err := service.Create(ctx, 2001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建新订单失败: %v", err)
	}
	newOrderObj, _ := service.FindByID(ctx, newOrder)
	err = service.ChangeStatusToCompleted(ctx, newOrderObj)
	if err != errdef.ErrOrderStatusNotMatch {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrOrderStatusNotMatch, err)
	}
}

func TestOrderServiceImpl_ResetOrder(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 创建一个订单
	orderID, err := service.Create(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 获取订单对象
	order, err := service.FindByID(ctx, orderID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}

	// 创建一个机器人
	bot := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 从待处理队列中取出订单
	_, err = repository.GetOrderRepository().TakePending(ctx, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("取出待处理订单失败: %v", err)
	}

	// 将订单状态改为处理中
	err = service.ChangeStatusToProcessing(ctx, order, bot)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	// 重置订单
	err = service.ResetOrder(ctx, order)
	if err != nil {
		t.Fatalf("重置订单失败: %v", err)
	}

	if order.Status != consts.OrderStatusPending {
		t.Errorf("期望订单状态为待处理(%d)，实际得到 %d", consts.OrderStatusPending, order.Status)
	}
	if order.BotID != 0 {
		t.Errorf("期望订单机器人ID为0，实际得到 %d", order.BotID)
	}

	// 测试nil订单
	err = service.ResetOrder(ctx, nil)
	if err != nil {
		t.Errorf("重置nil订单应该不返回错误，实际得到 %v", err)
	}
}

func TestOrderServiceImpl_MultipleOperations(t *testing.T) {
	initOrder()
	ctx := context.Background()
	service := GetOrderService()

	// 创建多个订单
	orderIDs := make([]int64, 3)
	for i := 0; i < 3; i++ {
		priority := consts.OrderPriorityNormal
		if i == 1 {
			priority = consts.OrderPriorityVip
		}

		orderID, err := service.Create(ctx, int64(1001+i), priority)
		if err != nil {
			t.Fatalf("创建订单%d失败: %v", i+1, err)
		}
		orderIDs[i] = orderID
	}

	// 查找未完成订单
	uncompleted, err := service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("查找未完成订单失败: %v", err)
	}
	if len(uncompleted) != 3 {
		t.Errorf("期望有3个未完成订单，实际有 %d", len(uncompleted))
	}

	// 处理第一个订单
	order1, _ := service.FindByID(ctx, orderIDs[0])
	bot1 := &models.Bot{
		ID:     1,
		Status: consts.BotStatusIdle,
	}

	// 从待处理队列中取出订单
	_, err = repository.GetOrderRepository().TakePending(ctx, order1.Priority)
	if err != nil {
		t.Fatalf("取出待处理订单失败: %v", err)
	}

	// 将订单状态改为处理中
	err = service.ChangeStatusToProcessing(ctx, order1, bot1)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	// 将订单状态改为已完成
	err = service.ChangeStatusToCompleted(ctx, order1)
	if err != nil {
		t.Fatalf("将订单状态改为已完成失败: %v", err)
	}

	// 处理第二个订单但重置它
	order2, _ := service.FindByID(ctx, orderIDs[1])
	bot2 := &models.Bot{
		ID:     2,
		Status: consts.BotStatusIdle,
	}

	// 从待处理队列中取出订单
	_, err = repository.GetOrderRepository().TakePending(ctx, order2.Priority)
	if err != nil {
		t.Fatalf("取出待处理订单失败: %v", err)
	}

	// 将订单状态改为处理中
	err = service.ChangeStatusToProcessing(ctx, order2, bot2)
	if err != nil {
		t.Fatalf("将订单状态改为处理中失败: %v", err)
	}

	// 重置订单
	err = service.ResetOrder(ctx, order2)
	if err != nil {
		t.Fatalf("重置订单失败: %v", err)
	}

	// 再次查找未完成订单
	uncompleted, err = service.FindUncompleted(ctx)
	if err != nil {
		t.Fatalf("查找未完成订单失败: %v", err)
	}
	if len(uncompleted) != 2 {
		t.Errorf("期望有2个未完成订单，实际有 %d", len(uncompleted))
	}

	// 查找已完成订单
	completed, err := service.FindRecentCompleted(ctx, 10)
	if err != nil {
		t.Fatalf("查找已完成订单失败: %v", err)
	}
	if len(completed) != 1 {
		t.Errorf("期望有1个已完成订单，实际有 %d", len(completed))
	}
	if completed[0].ID != orderIDs[0] {
		t.Errorf("期望已完成订单ID为 %d，实际得到 %d", orderIDs[0], completed[0].ID)
	}
}
