# 麦当劳订单管理系统

一个用Go语言实现的麦当劳订单管理系统，支持VIP订单优先级、机器人自动处理订单等功能。

## 功能特性

- **订单管理**：支持创建普通订单和VIP订单
- **VIP优先级**：VIP订单优先于普通订单处理
- **机器人管理**：动态增加/减少处理机器人
- **自动处理**：机器人自动拾取和处理订单（每个订单10秒）
- **实时状态**：查看系统状态、待处理订单、已完成订单和机器人状态
- **内存存储**：所有数据在内存中处理，无需持久化

## 项目结构

```
.
├── main.go                 # CLI主程序
├── order_system.go         # 核心业务逻辑
├── order_system_test.go    # 单元测试
├── go.mod                  # Go模块文件
└── script/
    ├── test.sh            # 测试脚本
    ├── build.sh           # 构建脚本
    └── run.sh             # 运行脚本
```

## 安装和运行

### 前置要求

- Go 1.21 或更高版本

### 快速开始

1. **构建应用程序**

```bash
sh script/build.sh
```

2. **运行测试**

```bash
sh script/test.sh
```

3. **运行应用程序**

```bash
# 交互式运行
./mc-order-system

# 或者使用运行脚本（包含演示场景）
sh script/run.sh
```

## 使用指南

### 交互式命令

启动程序后，您可以使用以下命令：

#### 订单管理

- `new normal` - 创建普通订单
- `new vip` - 创建VIP订单
- `pending` - 查看所有待处理订单
- `completed` - 查看所有已完成订单

#### 机器人管理

- `+bot` - 创建新机器人
- `-bot` - 删除最新的机器人
- `bots` - 查看所有机器人状态

#### 系统命令

- `status` - 显示系统状态统计
- `result` - 保存当前状态到 result.txt
- `clear` - 清屏
- `help` - 显示帮助信息
- `quit` - 退出程序

### 使用示例

```
=== McDonald's Order Management System ===
Interactive CLI - Type 'help' for available commands

> new normal
[14:30:15] Created normal order #1
> new vip
[14:30:18] Created VIP order #2
> +bot
Created bot #1
[14:30:20] Bot #1 started processing Order #2
> status

=== System Status ===
Pending Orders: VIP=0, Normal=1
Completed Orders: 0
Bots: Total=1, Idle=0, Working=1

> result
Result saved to result.txt
> quit
Goodbye!
```

## 业务规则

1. **订单优先级**：VIP订单总是优先于普通订单处理
2. **订单号**：订单号唯一且递增
3. **机器人处理**：
   - 每个机器人一次只能处理一个订单
   - 每个订单需要10秒完成处理
   - 机器人空闲时自动等待新订单
4. **机器人销毁**：
   - 删除机器人时，如果正在处理订单，订单返回待处理队列
   - 订单保持其原有的优先级位置
5. **内存存储**：所有数据在内存中处理，程序重启后数据丢失

## 测试结果

运行测试：

```bash
sh script/test.sh
```

测试覆盖以下功能：

- 订单系统初始化
- 创建订单（普通和VIP）
- 创建和删除机器人
- VIP订单优先级
- 机器人处理多个订单
- 机器人空闲状态
- 系统统计
- 订单ID唯一性
- 并发处理
- 结果输出

## 技术实现

### 数据结构

- **Order**：订单结构，包含ID、类型、状态、创建时间、机器人ID
- **Bot**：机器人结构，包含ID、当前订单、空闲状态
- **OrderSystem**：订单系统，管理订单队列、机器人和统计信息

### 并发安全

使用 `sync.Mutex` 确保并发访问订单系统时的数据一致性。

### 订单队列

- 维护两个队列：VIP队列和普通队列
- VIP订单总是优先处理
- 相同类型的订单按FIFO顺序处理

## 输出格式

`result.txt` 文件包含以下信息：

```
=== McDonald's Order Management System ===

Time: 14:30:25
Pending Orders: VIP=0, Normal=1
Completed Orders: 2
Bots: Total=2, Idle=1, Working=1

--- Pending Orders ---
[14:30:15] Order #3 (NORMAL) - Created at 14:30:15

--- Completed Orders ---
[14:30:10] Order #1 (NORMAL) - Completed
[14:30:12] Order #2 (VIP) - Completed

--- Bots ---
Bot #1: IDLE
Bot #2: Processing Order #3
```

所有时间戳格式为 `HH:MM:SS`。

## 开发说明

### 运行单个测试

```bash
go test -v -run TestCreateOrder
```

### 代码覆盖率

```bash
go test -cover
```

### 编译选项

```bash
# 优化编译
go build -o mc-order-system .

# 调试编译
go build -gcflags "all=-N -l" -o mc-order-system .
```

## 许可证

本项目为面试作业项目。

## 联系方式

如有问题或建议，请联系开发团队。
