# McDonald's Order Controller - Go 实现说明

这是一个基于 Go 的 CLI 原型，用来模拟 McDonald's 自动烹饪 bot 的订单控制系统。实现目标是满足 README 中 backend 方向的要求：使用 Go 编写 CLI，提供 `test.sh`、`build.sh`、`run.sh`，并将运行结果输出到 `scripts/result.txt`。

## 项目结构

```text
├── cmd/
│   └── main.go                    # CLI 入口，运行一段完整模拟流程
├── internal/
│   └── controller/
│       ├── controller.go          # 订单控制核心逻辑
│       └── controller_test.go     # 单元测试
├── scripts/
│   ├── build.sh                   # 编译 CLI 程序
│   ├── run.sh                     # 运行已编译程序并生成 result.txt
│   ├── test.sh                    # 执行单元测试
│   └── result.txt                 # CLI 输出结果
├── IMPLEMENTATION.md              # 本实现说明
├── go.mod                         # Go module 定义
└── README.md                      # 原始作业说明
```

## 核心设计

本实现没有把订单直接放进 channel 里做生产者消费者模型。原因是这个业务不是单纯 FIFO：

- VIP 订单需要优先于普通订单。
- 同类型订单需要保持 FIFO。
- bot 被删除时，如果正在处理订单，订单需要回到 pending 队列。
- 旧的处理 goroutine 不能在订单被退回后又错误地把它标记为 complete。

因此，这里采用 **coordinator/actor 模型**：

1. `Controller` 内部启动一个 coordinator goroutine。
2. 外部调用 `NewOrder`、`AddBot`、`RemoveBot`、`Snapshot` 时，只是向 `commands` channel 发送命令。
3. 订单队列、bot 列表、完成列表等可变状态只由 coordinator goroutine 读写。
4. bot 接单后会启动独立的订单制作 goroutine，内部用 timer 模拟 10 秒制作耗时；制作 goroutine 不直接修改状态，只会发回 `CompleteOrder` 命令。

这样既使用了 Go 的 channel 来协调并发，又避免多个 goroutine 同时读写订单队列，因此核心状态不需要 mutex。controller 关闭时使用 `done chan struct{}` 通知后台订单制作 goroutine 退出；这个作业只需要一个简单的广播停止信号，所以没有引入 context。

## 关键组件

### Order

- `ID`：唯一递增订单号。
- `Type`：订单类型，包含 `Normal` 和 `VIP`。
- `Status`：订单状态，当前订单快照中主要体现 `PENDING` 和 `COMPLETE`；正在处理的订单由 bot 的 `PROCESSING` 状态表示。

### Bot

- `ID`：唯一递增 bot 编号。
- `Status`：bot 状态，包含 `IDLE` 和 `PROCESSING`。
- `CurrentOrderID`：当前正在处理的订单 ID。

### Controller

`Controller` 是系统核心，负责：

- 创建普通订单和 VIP 订单。
- 增加或删除 bot。
- 调度 pending 订单给 idle bot。
- 接收订单完成事件。
- 返回系统当前状态快照。
- 通过 `Completed()` 暴露只读完成事件 channel，供 CLI 等待模拟流程继续执行。

## Pending 队列设计

为了让优先级逻辑更清楚，pending 订单没有使用一个混合队列再排序，而是拆成两个 FIFO 队列：

- `vipPending`
- `normalPending`

调度时永远先取 `vipPending`，如果 VIP 队列为空，再取 `normalPending`。新增订单和被取消的订单都会回到对应类型队列的尾部。

这个设计的好处是：

- 不需要排序。
- 不需要额外的 sequence 字段。
- VIP 优先级规则直观。
- 同类型 FIFO 顺序由 slice append 和从头 pop 自然保证。

## 并发与取消安全

bot 接到订单后会启动一个订单制作 goroutine。这个 goroutine 用 timer 模拟 10 秒制作耗时，结束后发送完成命令。coordinator 只有在以下信息仍然匹配时才会完成订单：

- bot ID
- order ID

如果 bot 在处理过程中被删除，订单会回到 pending 队列，而该 bot 会从 active bot 列表中移除。之后旧制作 goroutine 即使触发完成命令，也会因为找不到匹配的 active bot 而被忽略。

这避免了一个常见竞态：订单已经退回 pending，但旧 goroutine 又把它标记为 complete。

## 已实现需求

### 1. 普通订单创建

调用 `NewOrder(Normal)` 后会创建唯一递增订单，并进入 pending 队列。

### 2. VIP 订单优先

VIP 订单进入 `vipPending`，调度时始终优先于普通订单。同为 VIP 的订单仍保持 FIFO。

### 3. 订单号唯一递增

订单 ID 从 1 开始递增，由 coordinator goroutine 单独维护。

### 4. bot 处理订单

`AddBot` 会创建新 bot，并立即尝试从 pending 队列取单。每个订单需要 10 秒处理，完成后进入 completed 列表。

### 5. bot 空闲状态

如果没有 pending 订单，bot 保持 `IDLE`。后续有新订单进入时，controller 会再次尝试分配给 idle bot。

### 6. 删除 bot

`RemoveBot` 删除最新创建的 bot。如果该 bot 正在处理订单，订单会回到对应 pending 队列，并继续遵循 VIP/Normal 优先级。

### 7. 内存处理

所有状态都保存在内存中，没有数据库或文件持久化。

## 测试覆盖

单元测试覆盖了几个关键行为：

- VIP 订单优先于普通订单被派发。
- 删除正在处理的 bot 后，订单返回 pending 队列。
- 删除 bot 后，旧订单制作 goroutine 的完成事件会被忽略。
- bot 完成订单后会继续处理下一个优先级最高的订单。

测试命令：

```bash
./scripts/test.sh
```

## 使用方式

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

`build.sh` 会生成根目录下的 `order-controller` 二进制文件。`run.sh` 只运行这个已编译好的程序，并将输出写入 `scripts/result.txt`。

CLI 会先调用 `mockCommand` 模拟一组操作命令，包括下单、增加 bot、稍后新增 VIP 订单、最后删除 bot。controller 会在后台异步处理订单并把完成事件写入 `Completed()` channel。随后主流程阻塞监听完成事件和一个 `time.NewTimer`：每收到一个完成事件就重置 11 秒计时；如果连续 11 秒没有新的完成事件，就认为模拟流程已经没有更多订单完成，随后输出最终状态并返回。这样 `run.sh` 在 GitHub Actions 中仍然可以自动结束并生成稳定结果。

## 输出说明

`scripts/result.txt` 会包含一段完整模拟流程，展示：

- 创建普通订单和 VIP 订单。
- 增加 bot。
- VIP 订单优先处理。
- 订单在 10 秒后完成。
- bot 空闲和删除。
- 最终订单统计。

所有关键日志都包含 `HH:MM:SS` 格式时间戳，以满足 GitHub Actions 中对 `result.txt` 的校验要求。
