package repository

import (
	"context"
	"testing"

	"idreamshen.com/fmcode/consts"
	"idreamshen.com/fmcode/models"
)

func TestBotPoolMemory_GenerateID(t *testing.T) {
	pool := &BotPoolMemory{
		currentBotID: 0,
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

func TestBotPoolMemory_Create(t *testing.T) {
	// 为每个测试初始化一个新的存储库
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// 创建一个机器人
	bot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 验证机器人属性
	if bot.ID != 1 {
		t.Errorf("期望机器人ID为1，实际得到 %d", bot.ID)
	}
	if bot.Status != consts.BotStatusIdle {
		t.Errorf("期望机器人状态为空闲(%d)，实际得到 %d", consts.BotStatusIdle, bot.Status)
	}
	if bot.OrderID != 0 {
		t.Errorf("期望机器人订单ID为0，实际得到 %d", bot.OrderID)
	}

	// 验证机器人是否已添加到池中
	if pool.Bots.Len() != 1 {
		t.Errorf("期望池中有1个机器人，实际有 %d", pool.Bots.Len())
	}
	if len(pool.BotMap) != 1 {
		t.Errorf("期望BotMap中有1个机器人，实际有 %d", len(pool.BotMap))
	}
	if _, ok := pool.BotMap[bot.ID]; !ok {
		t.Errorf("在BotMap中未找到ID为 %d 的机器人", bot.ID)
	}
}

func TestBotPoolMemory_Add(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// 创建一个机器人对象
	bot := &models.Bot{
		ID:      42,
		Status:  consts.BotStatusIdle,
		OrderID: 0,
	}

	// 添加机器人到池中
	err := pool.Add(ctx, bot)
	if err != nil {
		t.Fatalf("添加机器人失败: %v", err)
	}

	// 验证机器人是否已添加到池中
	if pool.Bots.Len() != 1 {
		t.Errorf("期望池中有1个机器人，实际有 %d", pool.Bots.Len())
	}
	if len(pool.BotMap) != 1 {
		t.Errorf("期望BotMap中有1个机器人，实际有 %d", len(pool.BotMap))
	}
	if storedBot, ok := pool.BotMap[bot.ID]; !ok {
		t.Errorf("在BotMap中未找到ID为 %d 的机器人", bot.ID)
	} else if storedBot != bot {
		t.Errorf("存储的机器人与添加的机器人不同")
	}

	// 测试添加nil机器人
	err = pool.Add(ctx, nil)
	if err != nil {
		t.Fatalf("添加nil机器人应该不返回错误，但得到: %v", err)
	}
	if pool.Bots.Len() != 1 {
		t.Errorf("添加nil机器人后，期望池中仍有1个机器人，实际有 %d", pool.Bots.Len())
	}
}

func TestBotPoolMemory_FindByID(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// 创建一个机器人
	bot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 通过ID查找机器人
	foundBot, err := pool.FindByID(ctx, bot.ID)
	if err != nil {
		t.Fatalf("查找机器人失败: %v", err)
	}
	if foundBot == nil {
		t.Fatal("期望找到机器人，实际得到nil")
	}
	if foundBot.ID != bot.ID {
		t.Errorf("期望机器人ID为 %d，实际得到 %d", bot.ID, foundBot.ID)
	}

	// 尝试查找不存在的机器人
	nonExistentBot, err := pool.FindByID(ctx, 9999)
	if err != nil {
		t.Fatalf("查找不存在机器人时出现意外错误: %v", err)
	}
	if nonExistentBot != nil {
		t.Errorf("期望不存在机器人返回nil，实际得到 %+v", nonExistentBot)
	}
}

func TestBotPoolMemory_FindLast(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// 初始应该没有机器人
	lastBot, err := pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot != nil {
		t.Errorf("期望初始没有机器人，实际得到 %+v", lastBot)
	}

	// 创建多个机器人
	bots := make([]*models.Bot, 3)
	for i := 0; i < 3; i++ {
		bot, err := pool.Create(ctx)
		if err != nil {
			t.Fatalf("创建机器人%d失败: %v", i+1, err)
		}
		bots[i] = bot
	}

	// 查找最后一个机器人
	lastBot, err = pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot == nil {
		t.Fatal("期望找到最后一个机器人，实际得到nil")
	}
	if lastBot.ID != bots[2].ID {
		t.Errorf("期望最后一个机器人ID为 %d，实际得到 %d", bots[2].ID, lastBot.ID)
	}
}

func TestBotPoolMemory_Delete(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// 创建一个机器人
	bot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("创建机器人失败: %v", err)
	}

	// 删除机器人
	err = pool.Delete(ctx, bot)
	if err != nil {
		t.Fatalf("删除机器人失败: %v", err)
	}

	// 验证机器人是否已从池中删除
	if pool.Bots.Len() != 0 {
		t.Errorf("期望池中有0个机器人，实际有 %d", pool.Bots.Len())
	}
	if len(pool.BotMap) != 0 {
		t.Errorf("期望BotMap中有0个机器人，实际有 %d", len(pool.BotMap))
	}
	if _, ok := pool.BotMap[bot.ID]; ok {
		t.Errorf("在BotMap中仍能找到已删除的机器人 %d", bot.ID)
	}

	// 测试删除nil机器人
	err = pool.Delete(ctx, nil)
	if err != nil {
		t.Fatalf("删除nil机器人应该不返回错误，但得到: %v", err)
	}
}

func TestBotPoolMemory_MultipleOperations(t *testing.T) {
	InitBotRepository()
	pool := botStoragePtr.(*BotPoolMemory)
	ctx := context.Background()

	// 创建多个机器人
	bots := make([]*models.Bot, 5)
	for i := 0; i < 5; i++ {
		bot, err := pool.Create(ctx)
		if err != nil {
			t.Fatalf("创建机器人%d失败: %v", i+1, err)
		}
		bots[i] = bot
	}

	// 验证机器人数量
	if pool.Bots.Len() != 5 {
		t.Errorf("期望池中有5个机器人，实际有 %d", pool.Bots.Len())
	}

	// 删除中间的机器人
	err := pool.Delete(ctx, bots[2])
	if err != nil {
		t.Fatalf("删除机器人失败: %v", err)
	}

	// 验证机器人数量
	if pool.Bots.Len() != 4 {
		t.Errorf("删除一个后期望池中有4个机器人，实际有 %d", pool.Bots.Len())
	}

	// 查找最后一个机器人
	lastBot, err := pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot.ID != bots[4].ID {
		t.Errorf("期望最后一个机器人ID为 %d，实际得到 %d", bots[4].ID, lastBot.ID)
	}

	// 再创建一个机器人
	newBot, err := pool.Create(ctx)
	if err != nil {
		t.Fatalf("创建新机器人失败: %v", err)
	}

	// 验证新机器人是最后一个
	lastBot, err = pool.FindLast(ctx)
	if err != nil {
		t.Fatalf("查找最后一个机器人失败: %v", err)
	}
	if lastBot.ID != newBot.ID {
		t.Errorf("期望最后一个机器人ID为 %d，实际得到 %d", newBot.ID, lastBot.ID)
	}
}
