# 系统架构总览

## 模块划分

```
go.mod                                  模块定义 (module order-controller, go 1.23)
cmd/order-controller/main.go            入口：flag 解析、REPL 命令循环、模式无关
internal/controller/
    order.go                            Order、OrderType（领域模型）
    queue.go                            PriorityQueue（VIP/Normal 优先级队列，纯数据结构）
    queue_test.go                       队列单测
    controller.go                       Controller 引擎：bot 生命周期、分配、完成、销毁
    controller_test.go                  引擎单测
scripts/build.sh                        go build
scripts/test.sh                         go test ./...
scripts/run.sh                          构建 + 喂入演示脚本 → result.txt
docs/                                   工程文档（本目录树）
```

## 职责边界

| 模块 | 职责 | 不负责 |
|------|------|--------|
| `order.go` | 订单数据与字符串表示 | 顺序、并发 |
| `queue.go` | VIP/Normal 优先级入队/出队，纯同步、无锁、无时间 | bot、并发、日志 |
| `controller.go` | 状态机：持锁管理 pending/completed/bots，分配与并发处理 | 命令解析、I/O 格式 |
| `main.go` | 命令解析、flag、`wait`/`drain` 等编排 | 业务规则 |

## 分层原则

`main → controller → queue/order`，下层不依赖上层。
队列是优先级规则的唯一真相源，可独立、确定性地测试。

详细设计见 [30-design](../30-design/README.md)。
