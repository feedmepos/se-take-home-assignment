---
name: order-controller-pitfalls
description: Use when working on order controller, priority queue, cobra CLI, or demo simulation code. Contains rules to prevent previously discovered bugs around container/heap, Windows encoding, demo timing, git tracking, and goroutine lifecycle.
---

# Order Controller Pitfalls

基于 `docs/bugs/2026-06-11-bug-fixes.md` 总结的规则。

## container/heap 使用规则

### 1. heap 稳定排序必须用外部 seq 计数器
`container/heap` 的元素索引会因 `Swap` 重排，不能用 `i < j` 实现 FIFO。

```go
// Good:
type heapItem struct {
    Value *Order
    seq   uint64
}
func (pq innerPQ) Less(i, j int) bool {
    if pq[i].Value.Type != pq[j].Value.Type {
        return pq[i].Value.Type > pq[j].Value.Type  // VIP > Normal
    }
    return pq[i].seq < pq[j].seq  // FIFO within same type
}
```

### 2. Pop() 后必须保存 seq 到元素
`Pop()` 取出 `heapItem` 后，必须将 `heapItem.seq` 写回元素内部，供后续 `PushReturn`/`RemoveAt` 使用：

```go
func (q *Queue) Pop() *Order {
    hi := heap.Pop(&q.inner).(*heapItem)
    hi.Order.seq = hi.seq  // 必须！保存 seq
    return hi.Order
}
```

### 3. 任何从 heap 移除元素的操作都要保存 seq
包括 `Pop()`、`Remove()`、`RemoveAt()` 等。未保存 seq 会导致 `PushReturn` 使用零值 seq，破坏 FIFO。

### 4. Pop() 允许返回 nil
当 heap 为空时，`Pop()` 应返回 nil。调用方必须在解引用前检查 nil：

```go
o := q.Pop()
if o == nil {
    return  // 防御性检查
}
```

## Windows 兼容性

### 5. 输出避免非 ASCII 字符
Go `fmt.Fprintf` 输出 UTF-8，Windows cmd/PowerShell 的 `>` 重定向和 `Get-Content` 在非 UTF-8 代码页下会乱码。所有 CLI 输出用纯 ASCII：

```go
// Good:
c.record("%s -> PENDING", orderStr(o))

// Bad:
c.record("%s → PENDING", orderStr(o))
```

### 6. PowerShell 重定向使用 cmd /c
在 Windows 上测试 CLI 输出重定向时，用 `cmd /c` 而非 PowerShell 的 `>`：

```bash
# Good:
cmd /c ".\order.exe > scripts\result.txt"

# Bad:
.\order.exe > scripts\result.txt
```

## Demo / 仿真代码

### 7. 同步 goroutine 用 context 管理生命周期
裸 `chan struct{}` 无法在 panic 时通知 goroutine 退出：

```go
// Good:
ctx, cancel := context.WithCancel(context.Background())
defer cancel()
go func() {
    for {
        select {
        case <-tk.C:
            process()
        case <-ctx.Done():
            process()
            return
        }
    }
}()
```

### 8. Demo 睡眠时间必须覆盖完整事件链
计算所有并发事件的完成时间，确保最后一个 sleep 足够长：

```go
// 估算流程：
// t=0:   新订单入队
// t=200ms: +Bot x3, 开始处理
// t=4200ms: 之前订单完成, 新订单被领取
// t=6200ms: 最后一个订单完成
// → 最后一个 sleep 至少到 t=6300ms
time.Sleep(4 * time.Second)  // 而不是 demoDuration + 500ms
```

## Git 和项目结构

### 9. .gitignore 路径模式加前缀
避免 `order` 这样的宽泛模式意外匹配到目录路径：

```gitignore
# Good: 只匹配根目录下的 order 文件/目录
/order

# Bad: 匹配任何路径下的 order
order
```

### 10. .gitignore 条目添加前已跟踪的文件需手动移除
```bash
git rm --cached <file>   # 保留文件，取消跟踪
```

### 11. cobra Use 与二进制名保持一致
```go
// Good: 二进制是 order, Use 也必须是 order
&cobra.Command{Use: "order", ...}

// Bad:
&cobra.Command{Use: "order-controller", ...}
```

### 12. 领域命令定义在 domain package 中
按设计文档约定，命令定义放在 `internal/business/<domain>/commands.go`，而非 `cmd/root.go`。`cmd/root.go` 只负责注册：

```go
// internal/business/order/commands.go
func Commands() []*cobra.Command {
    return []*cobra.Command{{Use: "demo", ...}}
}

// cmd/root.go
for _, cmd := range order.Commands() {
    root.AddCommand(cmd)
}
```

## 输出格式

### 13. Demo 输出包含完整信息
Bot 领取订单时标注预计完成时间，完成时标注 Bot 编号，空闲时标注 IDLE：

```go
c.record("%s -> picked by Bot #%d (completes at %s)", ...)
c.record("%s -> COMPLETED by Bot #%d", ...)
c.record("Bot #%d -> IDLE (no pending orders)", ...)
```
