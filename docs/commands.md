# McDonald's 订单控制器 — 操作说明

## 模式

### 交互模式（终端运行）

```bash
go run ./cmd/main.go
```

适用于面试现场演示，实时输入命令、实时查看 bot 处理。

### 模拟模式（CI / 自动化）

```bash
go run ./cmd/main.go --simulate
# 或
./order-controller --simulate > scripts/result.txt
```

自动执行预设场景，输出带时间戳的日志，用于 CI 验证。

---

## 命令列表（交互模式）

### 添加普通订单

```
> normal
# 或
> n
```

输出示例：
```
[14:32:01] Normal Order #1001 added → PENDING
```

订单追加到普通队列尾部，按先进先出顺序处理。

---

### 添加 VIP 订单

```
> vip
# 或
> v
```

输出示例：
```
[14:32:02] VIP Order #1002 added → PENDING
```

订单追加到 VIP 队列尾部，**始终排在所有普通订单之前**。如果有多个 VIP 订单，按添加顺序处理。

---

### 添加机器人

```
> +bot
# 或
> bot+
# 或
> addbot
```

输出示例：
```
[14:32:03] Bot #1 created
```

添加后立即从 PENDING 队列取订单：
1. 先取 VIP 队列头部
2. VIP 队列为空时取普通队列头部
3. 队列为空则进入 IDLE 状态

每个订单处理时间 **10 秒**，完成后自动取下一个订单。

---

### 移除机器人

```
> -bot
# 或
> bot-
# 或
> removebot
```

输出示例：
```
[14:32:10] Bot #2 removed
```

- 移除**最新添加**的机器人
- 如果机器人在处理订单，订单回到对应队列**头部**，保持 VIP/Normal 优先级
- 无机器人可移除时提示 `No bots to remove`

---

### 查看状态

```
> status
# 或
> s
```

输出示例：
```
Orders: 1 pending, 2 completed | Bots: 1 active, 1 idle
VIP Queue: [#1002]
Normal Queue: [#1003]
```

- `pending` — 待处理订单数
- `completed` — 已完成订单数
- `active` — 正在处理订单的机器人
- `idle` — 空闲等待的机器人
- VIP/Normal Queue — 当前队列中的订单编号

---

### 帮助

```
> help
# 或
> h
```

显示所有命令列表。

---

### 退出

```
> exit
# 或
> quit
# 或
> q
```

---

## 异步事件

Bot 完成订单时会自动推送通知，不打断命令输入：

```
> n
[14:32:01] Normal Order #1001 added → PENDING
[14:32:05] Bot #1 completed VIP Order #1002 → COMPLETE    ← 自动推送
[14:32:05] Bot #1 started Normal Order #1003 → PROCESSING ← 自动推送
> status
```

---

## 执行脚本

| 脚本 | 作用 | 命令 |
|------|------|------|
| `scripts/build.sh` | 编译 CLI 二进制 | `./scripts/build.sh` |
| `scripts/test.sh` | 运行单元测试 | `./scripts/test.sh` |
| `scripts/run.sh` | 完整流水线（编译 → 运行 → result.txt） | `./scripts/run.sh` |

CI 流水线执行顺序：`test.sh → build.sh → run.sh → 验证 result.txt`

---

## 输出格式

所有日志使用 `[HH:MM:SS]` 时间戳格式：

```
[16:45:08] Bot #1 created → PROCESSING VIP Order #1002
[16:45:18] Bot #1 completed VIP Order #1002 → COMPLETE
```

状态流转标记：

| 标记 | 含义 |
|------|------|
| `→ PENDING` | 订单等待处理 |
| `→ PROCESSING` | 订单正在被机器人处理 |
| `→ COMPLETE` | 订单处理完成 |

---

## 完整演示流程

```text
> n
[14:32:01] Normal Order #1001 added → PENDING

> v
[14:32:02] VIP Order #1002 added → PENDING

> n
[14:32:03] Normal Order #1003 added → PENDING

> +bot                 ← Bot #1 取 VIP #1002
[14:32:04] Bot #1 created

> +bot                 ← Bot #2 取 Normal #1001
[14:32:05] Bot #2 created

> s                    ← 查看状态
Orders: 1 pending, 2 processing, 0 completed | Bots: 2 active, 0 idle
Normal Queue: [#1003]

> -bot                 ← 移除 Bot #2，Normal #1001 回到队列
[14:32:10] Bot #2 removed

> s
Orders: 2 pending, 0 processing, 0 completed | Bots: 0 active, 1 idle
VIP Queue: [#1002]
Normal Queue: [#1001, #1003]
```
