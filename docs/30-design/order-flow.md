# 核心流程：下单 → 分配 → 处理 → 完成 / 销毁

## 下单

`AddNormalOrder` / `AddVIPOrder`：持锁 → 生成递增 ID → 入队 → 日志 `Created ... PENDING`
→ 尝试把订单派给某个 IDLE bot（`idleBot()` + `assign`）。

## 增加机器人 `+bot`

持锁 → 创建 bot（IDLE）并入 `bots` → 日志 `Bot #x created ACTIVE` → 立即尝试领取一个 pending 订单。

## 分配与处理（assign → process → complete）

- `assign(bot)`（持锁，bot 必须空闲）：从队首 Dequeue；无单则置 IDLE 并日志；有单则绑定
  `bot.order`、建 `context`、日志 `picked up ... PROCESSING`，起一个 goroutine：

  ```
  select {
    case <-time.After(procDur): controller.complete(bot, o)   // 正常完成
    case <-ctx.Done():          return                        // 被销毁中止
  }
  ```

- `complete(bot, o)`（持锁）：**guard——若 `bot.order != o`（订单已被销毁退回，或 bot 已领了
  别的单）则直接返回**，防止竞态双处理（比 nil 检查更强，顺带防 ABA）；否则把订单移入
  completed、日志 `completed ... COMPLETE`、清空 `bot.order`，再 `assign` 下一单。

## 减少机器人 `-bot`

持锁 → 取 slice 末尾（最新）bot：

- 若正在处理：`cancel()` 中止 → 把订单按优先级规则**重新入队**（退回原区，维持 VIP/Normal
  优先级）→ 日志 `destroyed while processing, order returned` → **若存在 IDLE bot，立即把
  退回单派给它**（否则订单会滞留 pending、`drain` 永不结束——实测发现并修复，见
  [concurrency.md](concurrency.md)）。
- 若 IDLE：日志 `destroyed while idle`。
- 从 `bots` 移除。

## 编排命令（main.go）

- `wait N`：阻塞输入循环 N 秒（让后台 bot 推进），用于制造"处理中销毁"等时序场景。
- `drain`：轮询（100ms）直到 pending 为空且所有 bot IDLE——时长无关地等全部完成，批处理收尾用。
- `status`：打印 Final Status 汇总。
- `quit`/EOF：退出。

完整命令集见 [40-api/cli-commands.md](../40-api/cli-commands.md)。
