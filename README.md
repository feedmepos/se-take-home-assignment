# FeedMe 自动做菜机器人 — 订单控制器（Go）

[FeedMe SE take-home](https://github.com/feedmepos/se-take-home-assignment) 的 Go 后端实现：一个管理订单流转与做菜机器人的命令行控制器。

## 需求覆盖

| 需求 | 实现 |
|---|---|
| 普通订单进入 PENDING，处理后进入 COMPLETE | `NewOrder(Normal)` + 机器人处理 |
| VIP 订单优先（排在既有 VIP 之后、普通单之前） | 按 `(类型, 订单号)` 优先级有序入队 |
| 订单号唯一自增 | 控制器内自增序列 |
| `+Bot` 立即处理待处理订单，单单 10 秒 | 每台机器人一个 goroutine，`cookTime` 默认 10s |
| 空闲机器人等待新订单 | `sync.Cond` 等待，新单到达时唤醒 |
| `-Bot` 移除最新机器人；正在做的单退回 PENDING 原位 | 关闭 `quit`，在途订单按原优先级重新入队 |
| 无需持久化 | 全内存 |

## 快速开始

```bash
./build.sh                                  # 编译到 bin/orderbot
./test.sh                                    # go vet + go test -race
./run.sh --cook 2s                           # 交互运行（把 10s 调成 2s 便于观察）

# 脚本化喂命令（管道）
printf 'vip\nnormal\n+bot\nstatus\n' | ./run.sh --cook 1s
```

事件会带 `HH:MM:SS` 时间戳同时打到终端并写入 `result.txt`。

### Web 版（按钮 + 实时状态）

```bash
./web.sh --cook 2s          # 启动后打开 http://localhost:8080
```

单页控制台：四个按钮（普通 / VIP 订单、加 / 减机器人），三栏展示 PENDING、机器人（含正在做的单）、COMPLETE，状态每秒轮询刷新。复用同一套 `kitchen` 核心，通过 `POST /api/order/{normal,vip}`、`POST /api/bot/{add,remove}`、`GET /api/state` 交互。

## 命令

```
normal | n     下一张普通订单
vip    | v     下一张 VIP 订单
+bot   | b+    新增一台机器人
-bot   | b-    移除最新一台机器人
status | s     查看 PENDING / COMPLETE / 机器人状态
quit   | q     停止所有机器人并退出
```

## 设计要点

- **优先级队列**：`pending` 始终按 `(VIP 优先, 订单号升序)` 有序，二分插入。
  被抢占退回的订单用同一规则重新入队，天然回到原相对位置——无需记录下标。
- **并发模型**：单一互斥锁保护状态；每台机器人一个 goroutine，串行取单。
  空闲时 `sync.Cond.Wait`，加单 / 加机器人 / 停机器人均 `Broadcast` 唤醒重判。
- **抢占**：`-Bot` 关闭机器人的 `quit` 通道；若在烹饪中，`select` 命中 `quit`
  分支，把在途订单退回 `pending` 并唤醒其它机器人接手。
- **可测试性**：烹饪耗时可注入（测试用 40ms），事件日志可注入（测试传 nil）。
  测试带 `-race`。

## 目录

```
cmd/orderbot/main.go   CLI
kitchen/order.go       订单模型与优先级规则
kitchen/kitchen.go     控制器与机器人调度
kitchen/snapshot.go    只读状态快照
kitchen/kitchen_test.go 单元测试
```
