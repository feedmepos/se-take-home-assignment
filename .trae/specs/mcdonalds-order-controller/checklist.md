# Checklist

## 领域模型
- [x] Order 实体正确定义 (ID, Type, Status, CreatedAt)
- [x] OrderType 值对象正确定义 (Normal=0, VIP=1)
- [x] OrderStatus 值对象正确定义 (Pending, Processing, Complete)
- [x] 订单状态流转逻辑正确实现

## ID 生成器
- [x] Snowflake 算法正确实现
- [x] 支持 RestaurantID 隔离
- [x] 并发安全 (百万人同时下单)
- [x] 生成的 ID 全局唯一且递增

## 优先级队列
- [x] VIP 订单优先于普通订单
- [x] 同类型订单按 FIFO 顺序处理
- [x] 机器人减少时订单能返回原位置
- [x] 线程安全实现

## 烹饪机器人
- [x] Bot 实体正确定义 (ID, Status, CurrentOrder)
- [x] 订单处理时间为 10 秒
- [x] 支持 Idle 和 Processing 状态
- [x] 能正确处理订单完成和状态变更

## 机器人调度器
- [x] 支持动态增加机器人
- [x] 支持动态减少机器人（处理中订单返回队列）
- [x] 自动分配订单给空闲机器人
- [x] 正确处理并发增减机器人

## 应用服务
- [x] OrderService 能创建普通订单
- [x] OrderService 能创建 VIP 订单
- [x] BotService 能增加机器人
- [x] BotService 能减少机器人
- [x] 查询服务能正确返回系统状态

## CLI 界面
- [x] 支持 new-normal 命令
- [x] 支持 new-vip 命令
- [x] 支持 +bot 命令
- [x] 支持 -bot 命令
- [x] 支持 status 命令
- [x] 输出包含 HH:MM:SS 时间戳
- [x] 输出保存到 result.txt

## 脚本文件
- [x] scripts/test.sh 能运行所有单元测试
- [x] scripts/build.sh 能编译 CLI 应用
- [x] scripts/run.sh 能运行 CLI 并生成 result.txt

## GitHub Actions
- [x] test.sh 执行通过
- [x] build.sh 执行通过
- [x] run.sh 执行通过
- [x] result.txt 存在且非空
- [x] result.txt 包含 HH:MM:SS 时间戳
