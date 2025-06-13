package listener

import (
	"context"
	"testing"
	"time"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/eventbus"
	"idreamshen.com/fmcode/repository"
	"idreamshen.com/fmcode/service"
)

func setupTest() {
	// 初始化事件总线
	eventbus.InitEventBus()

	// 初始化存储库
	repository.InitBotRepository()
	repository.InitOrderRepository()

	// 初始化服务
	service.InitBotService()
	service.InitOrderService()
}

func TestProcessOrderCreated(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 创建一个普通订单
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 测试处理订单
	go processOrderCreated(ctx, bot)

	// 等待一段时间让处理完成
	time.Sleep(100 * time.Millisecond)

	// 验证订单状态已变为处理中
	updatedOrder, err := repository.GetOrderRepository().FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}

	if updatedOrder.Status != consts.OrderStatusProcessing {
		t.Errorf("期望订单状态为处理中(%d)，实际得到 %d", consts.OrderStatusProcessing, updatedOrder.Status)
	}

	if updatedOrder.BotID != bot.ID {
		t.Errorf("期望订单机器人ID为 %d，实际得到 %d", bot.ID, updatedOrder.BotID)
	}

	// 验证机器人状态已变为制餐中
	updatedBot, err := repository.GetBotRepository().FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("查找机器人失败: %v", err)
	}

	if updatedBot.Status != consts.BotStatusCooking {
		t.Errorf("期望机器人状态为制餐中(%d)，实际得到 %d", consts.BotStatusCooking, updatedBot.Status)
	}

	if updatedBot.OrderID != order.ID {
		t.Errorf("期望机器人订单ID为 %d，实际得到 %d", order.ID, updatedBot.OrderID)
	}
}

func TestBotCookOrder(t *testing.T) {
	setupTest()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 创建一个订单
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 测试制餐过程被取消
	go func() {
		// 等待一小段时间后取消订单
		time.Sleep(500 * time.Millisecond)
		order.CancelFunc()
	}()

	// 开始制餐
	err = botCookOrder(ctx, bot, order)
	if err != nil {
		t.Fatalf("制餐过程失败: %v", err)
	}

	// 验证订单状态已重置为待处理
	updatedOrder, err := repository.GetOrderRepository().FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}

	if updatedOrder.Status != consts.OrderStatusPending {
		t.Errorf("期望订单状态为待处理(%d)，实际得到 %d", consts.OrderStatusPending, updatedOrder.Status)
	}

	// 验证机器人状态已重置为空闲
	updatedBot, err := repository.GetBotRepository().FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("查找机器人失败: %v", err)
	}

	if updatedBot.Status != consts.BotStatusIdle {
		t.Errorf("期望机器人状态为空闲(%d)，实际得到 %d", consts.BotStatusIdle, updatedBot.Status)
	}
}

func TestBotCookOrderComplete(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 创建一个订单
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	go func() {
		if err := botCookOrder(ctx, bot, order); err != nil {
			t.Fatalf("制餐过程失败: %v", err)
		}
	}()

	// 等待足够的时间让处理完成
	time.Sleep(consts.OrderCookTime * 2)

	// 验证订单状态已变为已完成
	updatedOrder, err := repository.GetOrderRepository().FindByID(ctx, order.ID)
	if err != nil {
		t.Fatalf("查找订单失败: %v", err)
	}

	if updatedOrder.Status != consts.OrderStatusCompleted {
		t.Errorf("期望订单状态为已完成(%d)，实际得到 %d", consts.OrderStatusCompleted, updatedOrder.Status)
	}

	// 验证机器人状态已变为空闲
	updatedBot, err := repository.GetBotRepository().FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("查找机器人失败: %v", err)
	}

	if updatedBot.Status != consts.BotStatusIdle {
		t.Errorf("期望机器人状态为空闲(%d)，实际得到 %d", consts.BotStatusIdle, updatedBot.Status)
	}

}

func TestProcessOrderCreatedWithVipOrder(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 创建一个普通订单
	_, err = repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建普通订单失败: %v", err)
	}

	// 创建一个VIP订单
	vipOrder, err := repository.GetOrderRepository().CreatePending(ctx, 2001, consts.OrderPriorityVip)
	if err != nil {
		t.Fatalf("创建VIP订单失败: %v", err)
	}

	// 测试处理订单
	go processOrderCreated(ctx, bot)

	// 等待一段时间让处理完成
	time.Sleep(100 * time.Millisecond)

	// 验证VIP订单被优先处理
	updatedVipOrder, err := repository.GetOrderRepository().FindByID(ctx, vipOrder.ID)
	if err != nil {
		t.Fatalf("查找VIP订单失败: %v", err)
	}

	if updatedVipOrder.Status != consts.OrderStatusProcessing {
		t.Errorf("期望VIP订单状态为处理中(%d)，实际得到 %d", consts.OrderStatusProcessing, updatedVipOrder.Status)
	}

	if updatedVipOrder.BotID != bot.ID {
		t.Errorf("期望VIP订单机器人ID为 %d，实际得到 %d", bot.ID, updatedVipOrder.BotID)
	}
}

func TestBotCookOrderWithNilBot(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// 创建一个订单
	order, err := repository.GetOrderRepository().CreatePending(ctx, 1001, consts.OrderPriorityNormal)
	if err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 测试nil机器人
	err = botCookOrder(ctx, nil, order)
	if err == nil {
		t.Error("期望使用nil机器人时返回错误，实际没有错误")
	}
}

func TestBotCookOrderWithNilOrder(t *testing.T) {
	setupTest()
	ctx := context.Background()

	// 创建一个机器人
	bot, err := repository.GetBotRepository().Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 测试nil订单
	err = botCookOrder(ctx, bot, nil)
	if err == nil {
		t.Error("期望使用nil订单时返回错误，实际没有错误")
	}
}
