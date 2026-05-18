# McDonald's Order Management System - Go Implementation

## 项目概述 (Project Overview)

这是一个基于Go语言实现的麦当劳订单管理系统，模拟了自动化烹饪机器人的订单处理流程。

This is a Go-based implementation of McDonald's order management system, simulating automated cooking bot order processing.

## 功能特性 (Features)

### 1. 订单管理 (Order Management)
- 支持普通订单和VIP订单
- VIP订单优先处理（排在普通订单前面）
- 相同类型的订单按FIFO顺序处理
- 订单ID唯一且递增

### 2. 机器人管理 (Bot Management)
- 动态添加/移除烹饪机器人
- 每个机器人一次只能处理一个订单
- 每个订单处理时间为10秒
- 移除机器人时，正在处理的订单会返回队列并保持优先级

### 3. 并发安全 (Concurrency Safety)
- 使用互斥锁保证线程安全
- Goroutine处理订单异步执行
- 避免死锁的设计模式

## 项目结构 (Project Structure)

```
se-take-home-assignment/
├── cmd/
│   └── main.go              # 主程序入口
├── internal/
│   ├── order/
│   │   ├── order.go         # 订单管理逻辑
│   │   └── order_test.go    # 单元测试
│   └── bot/
│       └── bot.go           # 机器人管理逻辑
├── scripts/
│   ├── build.sh             # 构建脚本
│   ├── test.sh              # 测试脚本
│   ├── run.sh               # 运行脚本
│   └── result.txt           # 运行结果输出
├── go.mod                   # Go模块文件
└── order-controller         # 编译后的可执行文件
```

## 如何运行 (How to Run)

### 1. 运行测试 (Run Tests)
```bash
./scripts/test.sh
```

### 2. 构建应用 (Build Application)
```bash
./scripts/build.sh
```

### 3. 运行应用 (Run Application)
```bash
./scripts/run.sh
```

运行后会在 `scripts/result.txt` 生成包含时间戳的执行结果。

## 演示场景 (Demo Scenario)

程序会自动执行以下场景：

1. 创建2个普通订单
2. 创建1个VIP订单（应该排在普通订单前面）
3. 添加第1个机器人开始处理订单
4. 再创建1个VIP订单
5. 添加第2个机器人
6. 显示当前系统状态
7. 移除1个机器人（订单返回队列）
8. 显示最终状态并等待所有订单完成

## 技术要求符合性 (Technical Requirements Compliance)

✅ 使用Go语言实现  
✅ CLI应用程序可在GitHub Actions中执行  
✅ 实现了test.sh、build.sh、run.sh脚本  
✅ 结果输出到scripts/result.txt  
✅ 包含HH:MM:SS格式的时间戳  
✅ 所有单元测试通过  
✅ 代码简洁，带有中文注释  

## 核心设计 (Core Design)

### 订单优先级队列
- VIP订单始终排在普通订单前面
- 同类型订单保持FIFO顺序
- 使用插入排序维护队列顺序

### 机器人工作流程
1. 空闲状态：轮询待处理订单
2. 获取订单：从队列中取出最高优先级的订单
3. 处理订单：模拟10秒处理时间
4. 完成订单：标记为已完成，继续处理下一个
5. 被移除时：将当前订单返回队列并重新排序

### 并发控制
- 使用sync.Mutex保护共享数据
- 在持有锁期间不调用可能加锁的方法（避免死锁）
- 使用channel信号优雅停止goroutine
