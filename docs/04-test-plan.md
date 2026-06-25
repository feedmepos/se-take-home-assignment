# McDonald 订单管理系统 - 测试计划

| **文档编号** | **版本** | **创建日期** | **作者** |
|-------------|---------|-------------|---------|
| 04 | 1.0 | 2026-06-25 | QA Engineer |

---

## 一、测试概述

### 1.1 测试目标

确保 McDonald 订单管理系统满足所有功能需求，并具备良好的代码质量和稳定性。

### 1.2 测试范围

| 优先级 | 测试范围 | 说明 |
|-------|---------|------|
| P0 | 核心业务流程 | 订单创建、处理、完成 |
| P0 | VIP 优先级逻辑 | VIP 订单排在普通订单前 |
| P0 | 机器人管理 | 添加、移除、状态转换 |
| P1 | 并发安全性 | 多 goroutine 操作状态 |
| P1 | 边界条件 | 空队列、满负载等 |
| P2 | 输出格式验证 | 时间戳、result.txt |

### 1.3 假设与约束

- 测试在内存中执行，无需数据库
- 时间相关测试使用真实时间或模拟时间
- 并发测试使用 Go 原生测试框架

---

## 二、功能测试用例

### 2.1 订单创建测试

#### TC-001: 创建普通订单

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-001 |
| **用例名称** | 创建普通订单 |
| **前置条件** | 系统已启动，无订单 |
| **测试步骤** | 1. 输入命令 `normal`<br>2. 查看输出和状态 |
| **预期结果** | 1. 输出 `Order #1 created (Normal) - PENDING`<br>2. 订单编号为 1<br>3. 订单状态为 PENDING |
| **测试类型** | 功能测试 |

#### TC-002: 创建 VIP 订单

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-002 |
| **用例名称** | 创建 VIP 订单 |
| **前置条件** | 系统已启动 |
| **测试步骤** | 1. 输入命令 `vip`<br>2. 查看输出和状态 |
| **预期结果** | 1. 输出 `Order #1 created (VIP) - PENDING`<br>2. 订单编号为 1<br>3. 订单状态为 PENDING |
| **测试类型** | 功能测试 |

#### TC-003: 订单编号唯一递增

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-003 |
| **用例名称** | 订单编号唯一递增 |
| **前置条件** | 系统已启动 |
| **测试步骤** | 1. 创建 5 个普通订单<br>2. 创建 3 个 VIP 订单<br>3. 记录所有订单编号 |
| **预期结果** | 订单编号依次为 1, 2, 3, 4, 5, 6, 7, 8，无重复 |
| **测试类型** | 功能测试 |

---

### 2.2 VIP 优先级测试

#### TC-004: VIP 订单排在普通订单前

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-004 |
| **用例名称** | VIP 订单排在普通订单前 |
| **前置条件** | 系统已启动，无待处理订单 |
| **测试步骤** | 1. 创建订单序列: Normal #1 → VIP #2 → Normal #3<br>2. 执行 `status` 查看队列顺序 |
| **预期结果** | 队列顺序: [VIP #2, Normal #1, Normal #3] |
| **测试类型** | 功能测试 |

#### TC-005: 多个 VIP 订单保持相对顺序

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-005 |
| **用例名称** | 多个 VIP 订单保持相对顺序 |
| **前置条件** | 系统已启动 |
| **测试步骤** | 1. 创建 VIP #1 → VIP #2 → VIP #3<br>2. 创建 Normal #4 → Normal #5<br>3. 执行 `status` 查看队列 |
| **预期结果** | 队列顺序: [VIP #1, VIP #2, VIP #3, Normal #4, Normal #5] |
| **测试类型** | 功能测试 |

#### TC-006: VIP 插入到现有 VIP 之后

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-006 |
| **用例名称** | 新 VIP 插入到现有 VIP 之后 |
| **前置条件** | 已存在 VIP #1 和 Normal #2 |
| **测试步骤** | 1. 创建 VIP #3<br>2. 查看队列顺序 |
| **预期结果** | 队列顺序: [VIP #1, VIP #3, Normal #2] |
| **测试类型** | 功能测试 |

---

### 2.3 机器人管理测试

#### TC-007: 添加机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-007 |
| **用例名称** | 添加机器人 |
| **前置条件** | 系统已启动，无机器人 |
| **测试步骤** | 1. 输入命令 `add-bot`<br>2. 查看输出 |
| **预期结果** | 1. 输出 `Bot #1 created`<br>2. 机器人状态为 IDLE（无待处理订单时） |
| **测试类型** | 功能测试 |

#### TC-008: 机器人处理待处理订单

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-008 |
| **用例名称** | 机器人处理待处理订单 |
| **前置条件** | 已存在普通订单 #1，机器人 #1 处于 IDLE |
| **测试步骤** | 添加机器人 `#1` 到系统 |
| **预期结果** | 1. 输出 `Bot #1 processing Order #1`<br>2. 订单状态变为 PROCESSING |
| **测试类型** | 功能测试 |

#### TC-009: 机器人处理完成后继续处理下一订单

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-009 |
| **用例名称** | 机器人处理完成后继续处理 |
| **前置条件** | 机器人正在处理订单 |
| **测试步骤** | 1. 创建 2 个订单<br>2. 添加 1 个机器人<br>3. 等待 10+ 秒 |
| **预期结果** | 1. 订单 #1 在 ~10 秒后完成<br>2. 机器人自动处理订单 #2 |
| **测试类型** | 功能测试 + 性能测试 |

#### TC-010: 机器人 IDLE 状态

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-010 |
| **用例名称** | 机器人空闲状态 |
| **前置条件** | 系统存在机器人，无待处理订单 |
| **测试步骤** | 1. 添加机器人<br>2. 无订单时查看状态 |
| **预期结果** | 机器人状态为 IDLE |
| **测试类型** | 功能测试 |

#### TC-011: 新订单唤醒空闲机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-011 |
| **用例名称** | 新订单唤醒空闲机器人 |
| **前置条件** | 存在 IDLE 状态的机器人，无待处理订单 |
| **测试步骤** | 1. 添加机器人（处于 IDLE）<br>2. 创建新订单 |
| **预期结果** | 机器人立即开始处理新订单 |
| **测试类型** | 功能测试 |

---

### 2.4 机器人移除测试

#### TC-012: 移除处理中的机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-012 |
| **用例名称** | 移除处理中的机器人 |
| **前置条件** | 机器人正在处理订单 |
| **测试步骤** | 1. 添加机器人处理订单<br>2. 在 10 秒内执行 `remove-bot` |
| **预期结果** | 1. 机器人被移除<br>2. 订单返回待处理队列 |
| **测试类型** | 功能测试 |

#### TC-013: 移除机器人后订单返回保持优先级

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-013 |
| **用例名称** | 移除后订单保持优先级 |
| **前置条件** | 已存在: VIP #1, Normal #2 |
| **测试步骤** | 1. 添加机器人处理 VIP #1<br>2. 在 3 秒时添加 Normal #3 到队列<br>3. 在 5 秒时移除机器人 |
| **预期结果** | 队列顺序: [VIP #1（返回的）, Normal #2, Normal #3] |
| **测试类型** | 功能测试 |

#### TC-014: 移除最后一个机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-014 |
| **用例名称** | 移除最后一个机器人 |
| **前置条件** | 只有 1 个机器人 |
| **测试步骤** | 执行 `remove-bot` |
| **预期结果** | 机器人被移除，无错误 |
| **测试类型** | 功能测试 |

---

### 2.5 10 秒处理时间测试

#### TC-015: 订单处理时间验证

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-015 |
| **用例名称** | 订单处理时间 10 秒 |
| **前置条件** | 机器人准备就绪 |
| **测试步骤** | 1. 记录订单开始处理时间 T1<br>2. 记录订单完成时间 T2<br>3. 计算 T2 - T1 |
| **预期结果** | 处理时间在 10s ± 0.5s 范围内 |
| **测试类型** | 性能测试 |

#### TC-016: 多机器人并行处理

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-016 |
| **用例名称** | 多机器人并行处理 |
| **前置条件** | 4 个订单准备就绪 |
| **测试步骤** | 1. 创建 4 个订单<br>2. 添加 2 个机器人<br>3. 观察处理时间 |
| **预期结果** | 2 个订单同时处理，4 个订单总耗时约 20 秒 |
| **测试类型** | 性能测试 + 并发测试 |

---

## 三、边界测试用例

### 3.1 极端场景

#### TC-017: 空队列添加机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-017 |
| **用例名称** | 无订单时添加机器人 |
| **测试步骤** | 1. 系统启动，无订单<br>2. 添加机器人 |
| **预期结果** | 机器人创建成功，处于 IDLE 状态 |
| **测试类型** | 边界测试 |

#### TC-018: 无机器人时创建订单

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-018 |
| **用例名称** | 无机器人时创建订单 |
| **测试步骤** | 1. 系统启动<br>2. 创建多个订单，不添加机器人 |
| **预期结果** | 订单正常创建，状态为 PENDING |
| **测试类型** | 边界测试 |

#### TC-019: 连续快速创建订单

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-019 |
| **用例名称** | 快速连续创建订单 |
| **测试步骤** | 在 1 秒内创建 10 个订单 |
| **预期结果** | 所有订单正确创建，编号唯一递增 |
| **测试类型** | 压力测试 |

#### TC-020: 快速添加和移除机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-020 |
| **用例名称** | 快速添加移除机器人 |
| **测试步骤** | 1. 添加机器人<br>2. 立即移除<br>3. 重复 5 次 |
| **预期结果** | 机器人计数正确，订单状态正常 |
| **测试类型** | 压力测试 |

---

### 3.2 错误处理

#### TC-021: remove-bot 无机器人可移除

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-021 |
| **用例名称** | 无机器人时执行 remove-bot |
| **测试步骤** | 系统启动，无机器人，执行 `remove-bot` |
| **预期结果** | 提示 "No bot to remove" 或类似信息 |
| **测试类型** | 错误处理测试 |

#### TC-022: 未知命令处理

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-022 |
| **用例名称** | 未知命令处理 |
| **测试步骤** | 输入任意未知命令，如 `abc` |
| **预期结果** | 提示 "Unknown command: abc" |
| **测试类型** | 错误处理测试 |

---

## 四、并发安全测试

### 4.1 并发测试用例

#### TC-023: 并发创建订单

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-023 |
| **用例名称** | 并发创建订单 |
| **并发度** | 10 个 goroutine 同时创建订单 |
| **测试步骤** | 1. 启动 10 个 goroutine<br>2. 每个创建 100 个订单<br>3. 验证订单总数和编号唯一性 |
| **预期结果** | 1. 总订单数 = 1000<br>2. 所有订单编号唯一<br>3. 无 panic 或死锁 |
| **测试类型** | 并发测试 |

#### TC-024: 并发添加机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-024 |
| **用例名称** | 并发添加机器人 |
| **并发度** | 5 个 goroutine 同时添加机器人 |
| **测试步骤** | 5 个 goroutine 各添加 10 个机器人 |
| **预期结果** | 1. 总机器人数 = 50<br>2. 所有机器人 ID 唯一<br>3. 无并发冲突 |
| **测试类型** | 并发测试 |

#### TC-025: 并发创建订单和添加机器人

| 项目 | 内容 |
|-----|------|
| **用例ID** | TC-025 |
| **用例名称** | 混合并发操作 |
| **并发度** | 订单创建 + 机器人添加同时进行 |
| **测试步骤** | 1. Goroutine A: 持续创建订单<br>2. Goroutine B: 持续添加机器人<br>3. 运行 5 秒后停止 |
| **预期结果** | 1. 订单和机器人数量正确<br>2. 所有正在处理的订单状态正确<br>3. 无死锁或数据竞争 |
| **测试类型** | 并发测试 + 压力测试 |

---

## 五、单元测试设计

### 5.1 Model 层测试

```go
// internal/model/order_test.go
func TestOrderCreation(t *testing.T) {
    order := NewOrder(OrderTypeNormal)
    assert.Equal(t, 1, order.ID)
    assert.Equal(t, OrderTypeNormal, order.Type)
    assert.Equal(t, OrderStatusPending, order.Status)
    assert.NotNil(t, order.CreatedAt)
}

func TestOrderStatusTransition(t *testing.T) {
    order := NewOrder(OrderTypeVIP)
    assert.Equal(t, OrderStatusPending, order.Status)

    order.Status = OrderStatusProcessing
    assert.Equal(t, OrderStatusProcessing, order.Status)

    order.Status = OrderStatusComplete
    assert.Equal(t, OrderStatusComplete, order.Status)
}
```

### 5.2 Queue 层测试

```go
// internal/queue/priority_queue_test.go
func TestVIPBeforeNormal(t *testing.T) {
    q := NewPriorityQueue()
    vip := &model.Order{ID: 1, Type: model.OrderTypeVIP}
    normal := &model.Order{ID: 2, Type: model.OrderTypeNormal}

    q.Enqueue(normal)
    q.Enqueue(vip)

    result := q.Dequeue()
    assert.Equal(t, vip.ID, result.ID)
}

func TestMultipleVIPOrder(t *testing.T) {
    q := NewPriorityQueue()
    vip1 := &model.Order{ID: 1, Type: model.OrderTypeVIP}
    vip2 := &model.Order{ID: 2, Type: model.OrderTypeVIP}
    normal := &model.Order{ID: 3, Type: model.OrderTypeNormal}

    q.Enqueue(vip1)
    q.Enqueue(normal)
    q.Enqueue(vip2)

    assert.Equal(t, vip1.ID, q.Dequeue().ID)
    assert.Equal(t, vip2.ID, q.Dequeue().ID)
    assert.Equal(t, normal.ID, q.Dequeue().ID)
}
```

### 5.3 System 层测试

```go
// internal/system/state_test.go
func TestCreateOrderIncrementsID(t *testing.T) {
    state := NewSystemState()
    for i := 1; i <= 100; i++ {
        order := state.CreateOrder(model.OrderTypeNormal)
        assert.Equal(t, i, order.ID)
    }
}

func TestAddBotIncrementsBotID(t *testing.T) {
    state := NewSystemState()
    for i := 1; i <= 10; i++ {
        bot := state.AddBot()
        assert.Equal(t, i, bot.ID)
    }
}

func TestRemoveBotReturnsOrderToQueue(t *testing.T) {
    state := NewSystemState()
    order := state.CreateOrder(model.OrderTypeVIP)
    bot := state.AddBot()

    state.RemoveBot()

    assert.Contains(t, state.pending, order)
}
```

### 5.4 Output 层测试

```go
// internal/output/writer_test.go
func TestTimestampFormat(t *testing.T) {
    ts := time.Now().Format("15:04:05")
    assert.Regexp(t, `^\d{2}:\d{2}:\d{2}$`, ts)
}
```

---

## 六、集成测试场景

### 6.1 完整业务流程测试

#### IT-001: 端到端订单处理流程

```go
func TestEndToEndOrderProcessing(t *testing.T) {
    state := NewSystemState()

    // 1. 创建多个订单
    normal1 := state.CreateOrder(model.OrderTypeNormal)
    vip1 := state.CreateOrder(model.OrderTypeVIP)
    normal2 := state.CreateOrder(model.OrderTypeNormal)

    // 2. 验证优先级
    assert.Equal(t, vip1.ID, state.pending[0].ID)
    assert.Equal(t, normal1.ID, state.pending[1].ID)
    assert.Equal(t, normal2.ID, state.pending[2].ID)

    // 3. 添加机器人
    bot := state.AddBot()

    // 4. 验证 VIP 优先处理
    assert.Equal(t, vip1.ID, bot.Current.ID)

    // 5. 等待 10 秒
    time.Sleep(11 * time.Second)

    // 6. 验证订单完成
    assert.Equal(t, model.OrderStatusComplete, vip1.Status)
    assert.Equal(t, bot.ID, state.bots[bot.ID].ID) // Bot 仍在工作
}
```

#### IT-002: 机器人移除恢复测试

```go
func TestBotRemovalRecovery(t *testing.T) {
    state := NewSystemState()

    // 准备订单
    order := state.CreateOrder(model.OrderTypeNormal)

    // 添加并立即移除机器人
    bot := state.AddBot()
    go func() {
        time.Sleep(2 * time.Second)
        state.RemoveBot()
    }()

    // 等待处理中断
    time.Sleep(500 * time.Millisecond)

    // 验证订单回到待处理队列
    assert.Contains(t, state.pending, order)
    assert.Equal(t, model.OrderStatusPending, order.Status)
}
```

---

## 七、测试覆盖率目标

### 7.1 覆盖率要求

| 模块 | 行覆盖率目标 | 关键路径覆盖 |
|------|-------------|-------------|
| `model` | 100% | 100% |
| `queue` | 95% | 100% |
| `system` | 90% | 100% |
| `output` | 80% | 100% |
| **整体** | **90%** | **100%** |

### 7.2 关键路径清单

| 路径 | 描述 |
|-----|------|
| 创建订单 | `normal`/`vip` → CreateOrder → pending |
| VIP 优先级 | VIP Enqueue → 插入到正确位置 |
| 机器人处理 | AddBot → assignNextOrder → startProcessing |
| 订单完成 | Timer 触发 → completeOrder → assignNextOrder |
| 机器人移除 | RemoveBot → stopProcessing → returnToPending |
| 并发安全 | 所有操作通过 Mutex 保护 |

---

## 八、测试执行计划

### 8.1 测试阶段

| 阶段 | 活动 | 产出物 |
|-----|------|-------|
| 单元测试 | 各模块独立测试 | `*_test.go` 测试文件 |
| 集成测试 | 模块间交互测试 | `integration_test.go` |
| 系统测试 | 完整流程验证 | 测试报告 |
| 压力测试 | 高并发场景 | 性能报告 |

### 8.2 执行命令

```bash
# 运行所有测试
go test -v -race ./...

# 生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# 运行特定测试
go test -v -run TestVIPPriority

# 并发测试
go test -v -race -count=1 ./internal/system/
```

---

## 九、测试环境

### 9.1 环境要求

| 项目 | 要求 |
|-----|------|
| Go 版本 | >= 1.21 |
| 操作系统 | macOS / Linux |
| 内存 | >= 2GB |
| CPU | >= 2 cores |

### 9.2 测试数据

- 测试使用内存中的数据，无需持久化
- 订单 ID 和机器人 ID 在测试间隔离

---

## 十、风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 时间相关测试不稳定 | 高 | 使用 channel 同步或实际等待 |
| 并发测试可能超时 | 中 | 增加测试超时时间，使用 `-timeout` |
| 状态竞争导致 flaky 测试 | 高 | 使用 `-race` 检测，确保正确的锁使用 |
| Timer 测试难以模拟 | 中 | 使用依赖注入的时钟接口 |

---

*文档版本: 1.0*
*最后更新: 2026-06-25*
