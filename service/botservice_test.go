package service

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/errdef"
	"idreamshen.com/fmcode/models"
	"idreamshen.com/fmcode/repository"
)

func initBot() {
	// 初始化存储库
	repository.InitBotRepository()
	// 初始化服务
	InitBotService()
}

func TestBotServiceImpl_FindLast(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// 初始应该没有机器人
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot != nil {
		t.Errorf("期望初始没有机器人，实际得到 %+v", lastBot)
	}

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 查找最后一个机器人
	lastBot, err = service.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot == nil {
		t.Fatal("期望找到最后一个机器人，实际得到nil")
	}
	if lastBot.ID != bot.ID {
		t.Errorf("期望最后一个机器人ID为 %d，实际得到 %d", bot.ID, lastBot.ID)
	}
}

func TestBotServiceImpl_Add(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// 添加机器人前，应该没有机器人
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot != nil {
		t.Errorf("期望初始没有机器人，实际得到 %+v", lastBot)
	}

	// 添加机器人
	err = service.Add(ctx)
	if err != nil {
		t.Fatalf("添加机器人失败: %v", err)
	}

	// 添加后应该有一个机器人
	lastBot, err = service.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot == nil {
		t.Fatal("期望找到最后一个机器人，实际得到nil")
	}
	if lastBot.ID != 1 {
		t.Errorf("期望最后一个机器人ID为1，实际得到 %d", lastBot.ID)
	}
}

func TestBotServiceImpl_Delete(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 删除机器人
	err = service.Delete(ctx, bot)
	if err != nil {
		t.Fatalf("删除机器人失败: %v", err)
	}

	// 删除后应该没有机器人
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot != nil {
		t.Errorf("期望删除后没有机器人，实际得到 %+v", lastBot)
	}

	// 测试删除nil机器人
	err = service.Delete(ctx, nil)
	if err != nil {
		t.Fatalf("删除nil机器人应该不返回错误，但得到: %v", err)
	}
}

func TestBotServiceImpl_ChangeStatusToCooking(t *testing.T) {
	initBot()
	ctx := context.Background()
	service := GetBotService()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 创建一个订单
	order := &models.Order{
		ID:         1,
		CustomerID: 1001,
		Priority:   consts.OrderPriorityNormal,
		Status:     consts.OrderStatusPending,
	}

	// 将机器人状态改为制餐中
	err = service.ChangeStatusToCooking(ctx, bot, order)
	if err != nil {
		t.Fatalf("将机器人状态改为制餐中失败: %v", err)
	}

	if bot.Status != consts.BotStatusCooking {
		t.Errorf("期望机器人状态为制餐中(%d)，实际得到 %d", consts.BotStatusCooking, bot.Status)
	}
	if bot.OrderID != order.ID {
		t.Errorf("期望机器人订单ID为 %d，实际得到 %d", order.ID, bot.OrderID)
	}

	// 测试nil机器人
	err = service.ChangeStatusToCooking(ctx, nil, order)
	if err != errdef.ErrBotNotFound {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrBotNotFound, err)
	}

	// 测试nil订单
	err = service.ChangeStatusToCooking(ctx, bot, nil)
	if err != errdef.ErrOrderNotFound {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrOrderNotFound, err)
	}

	// 测试非空闲状态的机器人
	nonIdleBot := &models.Bot{
		ID:      2,
		Status:  consts.BotStatusCooking,
		OrderID: 999,
	}
	err = service.ChangeStatusToCooking(ctx, nonIdleBot, order)
	if err != errdef.ErrBotStatusNotIdle {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrBotStatusNotIdle, err)
	}
}

func TestBotServiceImpl_ChangeStatusToIdle(t *testing.T) {
	initBot()

	ctx := context.Background()
	service := GetBotService()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 创建一个订单
	order := &models.Order{
		ID:         1,
		CustomerID: 1001,
		Priority:   consts.OrderPriorityNormal,
		Status:     consts.OrderStatusPending,
	}

	// 先将机器人状态改为制餐中
	err = service.ChangeStatusToCooking(ctx, bot, order)
	if err != nil {
		t.Fatalf("将机器人状态改为制餐中失败: %v", err)
	}

	// 将机器人状态改为空闲
	err = service.ChangeStatusToIdle(ctx, bot)
	if err != nil {
		t.Fatalf("将机器人状态改为空闲失败: %v", err)
	}

	if bot.Status != consts.BotStatusIdle {
		t.Errorf("期望机器人状态为空闲(%d)，实际得到 %d", consts.BotStatusIdle, bot.Status)
	}
	if bot.OrderID != 0 {
		t.Errorf("期望机器人订单ID为0，实际得到 %d", bot.OrderID)
	}

	// 测试nil机器人
	err = service.ChangeStatusToIdle(ctx, nil)
	if err != errdef.ErrBotNotFound {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrBotNotFound, err)
	}

	// 测试非制餐中状态的机器人
	idleBot := &models.Bot{
		ID:      2,
		Status:  consts.BotStatusIdle,
		OrderID: 0,
	}
	err = service.ChangeStatusToIdle(ctx, idleBot)
	if err != errdef.ErrBotStatusNotCooking {
		t.Errorf("期望错误为 %v，实际得到 %v", errdef.ErrBotStatusNotCooking, err)
	}
}

func TestBotServiceImpl_MultipleOperations(t *testing.T) {
	initBot()

	ctx := context.Background()
	service := GetBotService()

	// 添加多个机器人
	for i := 0; i < 3; i++ {
		err := service.Add(ctx)
		if err != nil {
			t.Fatalf("添加机器人%d失败: %v", i+1, err)
		}
	}

	// 查找最后一个机器人
	lastBot, err := service.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot == nil {
		t.Fatal("期望找到最后一个机器人，实际得到nil")
	}
	if lastBot.ID != 3 {
		t.Errorf("期望最后一个机器人ID为3，实际得到 %d", lastBot.ID)
	}

	// 创建一个订单
	order := &models.Order{
		ID:         1,
		CustomerID: 1001,
		Priority:   consts.OrderPriorityNormal,
		Status:     consts.OrderStatusPending,
	}

	// 将机器人状态改为制餐中
	err = service.ChangeStatusToCooking(ctx, lastBot, order)
	if err != nil {
		t.Fatalf("将机器人状态改为制餐中失败: %v", err)
	}

	// 删除第二个机器人
	secondBot, _ := repository.GetBotRepository().FindByID(ctx, 2)
	err = service.Delete(ctx, secondBot)
	if err != nil {
		t.Fatalf("删除第二个机器人失败: %v", err)
	}

	// 将最后一个机器人状态改为空闲
	err = service.ChangeStatusToIdle(ctx, lastBot)
	if err != nil {
		t.Fatalf("将机器人状态改为空闲失败: %v", err)
	}

	// 删除最后一个机器人
	err = service.Delete(ctx, lastBot)
	if err != nil {
		t.Fatalf("删除最后一个机器人失败: %v", err)
	}

	// 查找最后一个机器人，应该是第一个机器人
	lastBot, err = service.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot == nil {
		t.Fatal("期望找到最后一个机器人，实际得到nil")
	}
	if lastBot.ID != 1 {
		t.Errorf("期望最后一个机器人ID为1，实际得到 %d", lastBot.ID)
	}
}
