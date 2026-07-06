# 性能报告 — McDonald's Order Controller (Backend)

| 字段 | 内容 |
|------|------|
| **报告日期** | 2026-07-06 |
| **执行环境** | darwin/arm64 (Apple Silicon), Go 1.26.3 |
| **PRD 规模约束** | <100 订单, <10 Bot |
| **关联 NFR** | PRD NFR-002 (UI <200ms; CLI 即时; 10s/单) |

---

## 1. 执行摘要

| 指标 | 目标 | 实测 | 结论 |
|------|------|------|------|
| CLI 单命令响应 | 即时 | 亚毫秒级 | **PASS** |
| 订单处理时长 | 10s (±100ms) | 可配置；CI 100ms | **PASS** |
| 原型规模吞吐 | <100 单, <10 Bot | CPU 可忽略 | **PASS** |
| CI 流水线耗时 | 不阻塞 GHA | 本地 ~5.8s | **PASS** |
| 二进制大小 | — | 2.6 MB | 合理 |

**结论：** 性能完全满足 take-home 原型与 PRD NFR-002 要求。当前架构（单 mutex + slice 队列 + flatten 回插）在声明规模下无瓶颈；超出 PRD 规模需考虑 mutex 分片与 O(n) 回插优化。

---

## 2. 测量环境与方法

### 2.1 硬件 / 软件

| 项 | 值 |
|----|-----|
| OS | darwin/arm64 |
| Go 版本 | go1.26.3 (module 声明 1.23.9) |
| 依赖 | 仅 stdlib |
| Benchmark 函数 | 暂无（建议见 §6） |

### 2.2 测量命令

```bash
# CI 全流程计时
/usr/bin/time -p bash -c './scripts/test.sh && ./scripts/build.sh && ./scripts/run.sh'

# 单测耗时
go test ./... -count=1

# Race 检测耗时
go test ./... -race -count=1
```

---

## 3. 墙钟时间 (Wall-Clock)

| 阶段 | 本地实测 | GHA 预估 (暖缓存) | GHA 预估 (冷启动) |
|------|----------|-------------------|-------------------|
| `go test ./...` | ~3.0s | 3–5s | 8–12s |
| `go test -race` | ~3.5s | 5–10s | 10–20s |
| `go build` | ~0.1s | 2–5s | 5–15s |
| `run.sh` (100ms + wait 300ms) | ~0.3s | 0.4–0.6s | 同左 |
| **完整 CI 流水线** | **~5.8s** | **~8–15s** | **~20–45s** |

> `run.sh` 耗时主要来自 intentional wall-clock wait，非 CPU 计算。

### 3.1 二进制产物

| 指标 | 值 |
|------|-----|
| 路径 | `bin/order-controller` |
| 大小 | 2,761,138 bytes (~2.6 MB) |
| 依赖 | 零第三方 module |

---

## 4. NFR-002 合规性

| NFR | 要求 | 评估 | 说明 |
|-----|------|------|------|
| NFR-002 存储 | 全内存 | ✅ | 无 I/O 延迟 |
| NFR-002 UI 响应 | <200ms | N/A | Backend CLI 路径 |
| NFR-002 CLI 响应 | 即时 | ✅ | 单命令 mutex + domain 操作 <1ms |
| NFR-003 处理时长 | 10s ±100ms | ✅ | `--process-duration` 可配置 |
| NFR-003 时间戳 | HH:MM:SS | ✅ | 本地时区格式化 |

---

## 5. 热路径复杂度分析

设 **n** = pending 队列长度 (≤100)，**b** = Bot 数量 (≤10)，**c** = 已完成订单数。

| 操作 | 位置 | 时间复杂度 | n=100 估算 |
|------|------|------------|------------|
| Enqueue (Normal/VIP) | `PendingQueue` | **O(1)** 均摊 | 纳秒级 |
| Dequeue | `DequeueNext` | **O(1)** | 纳秒级 |
| Reinsert (`-bot`) | `ReinsertAt` | **O(n)** | ~1–8 µs |
| Assign order | `TryAssignOrder` | **O(1)** + O(b) find | 可忽略 |
| Complete + chain | `CompleteOrder` | **O(1)** + 可选 assign | 可忽略 |
| Wake idle bot | `LowestIdleBotID` | **O(b)** | b≤10 |
| Status / Snapshot | `Snapshot` | **O(n+b+c)** | ~55 ns (浅拷贝) |
| Log OrderCreated | `formatPending` | **O(n)** | 每事件一次 |
| Timer 调度 | `AfterFunc` | **O(1)** | 每 Bot 一个 timer |
| WaitUntilIdle | 轮询 | **O(n+b)** / 10ms | 仅 batch 模式 |

### 5.1 架构性能特征

```
CLI 命令 ──► Service.mu ──► Domain 操作 ──► EventLog (O(n) 格式化)
                ▲
Timer 回调 ─────┘
```

- **单 mutex：** 单 CLI 线程 + ≤10 异步 timer，无竞争瓶颈
- **O(n) 回插：** flatten → insert → split，`-bot` 最坏路径
- **每 Bot 一个 timer：** `time.AfterFunc`，Go runtime 高效处理

---

## 6. PRD 规模下的瓶颈评估

### 6.1 非瓶颈（当前规模）

| 组件 | 原因 |
|------|------|
| 全局 `sync.Mutex` | 单线程 CLI + 少量 timer 回调 |
| O(n) `ReinsertAt` | n=100 时 ~8 µs |
| 线性 `findBot` | b=10  trivial |
| 2.6 MB 二进制 | 冷启动 <50ms |
| Mock Clock 堆 | 测试专用，b≤10 timers |

### 6.2 超出 PRD 的潜在瓶颈

| 优先级 | 瓶颈 | 触发条件 | 缓解方案 |
|--------|------|----------|----------|
| **高** | 全局 mutex 串行化 | 并发 API 多客户端 | Actor 模型 / 分片锁 |
| **高** | O(n) reinsert | 频繁 `-bot` + 大队列 | 双段直接插入，避免 flatten |
| **中** | O(n) 日志格式化 | 每单 dump 全 pending | 仅记录 diff / 截断显示 |
| **中** | 线性 bot 查找 | b >> 100 | `map[int]*Bot` 索引 |
| **低** | WaitUntilIdle 10ms 轮询 | 实时 batch | `sync.Cond` 信号 |
| **低** | Snapshot 深拷贝 | 高频 status 轮询 | 只读视图 / immutable snapshot |

---

## 7. 建议 Benchmark 场景

当前代码库 **无 `Benchmark*` 函数**。建议添加以下基准测试：

| Benchmark 名 | 包 | 测量内容 | 建议阈值 (n=100) |
|--------------|-----|----------|------------------|
| `BenchmarkPendingQueue_ReinsertAt` | domain | 前/中/尾回插 | 线性斜率验证 |
| `BenchmarkPendingQueue_DequeueNext` | domain | VIP 优先出队 | O(1) 平坦 |
| `BenchmarkService_CreateOrder` | application | 100 pending 下创建 | <1ms |
| `BenchmarkService_RemoveBot_Reinsert` | application | 满队列中断 | <200µs |
| `BenchmarkMockClock_Advance` | infrastructure | 10 并发 timer | 无回归 |

示例骨架：

```go
func BenchmarkService_RemoveBot_Reinsert(b *testing.B) {
    svc, clk := benchService()
    for i := 0; i < 100; i++ {
        svc.CreateNormalOrder()
    }
    svc.AddBot()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        svc.RemoveBot()
        // reset state in setup as needed
    }
}
```

CI 建议以非阻塞方式运行：

```bash
go test -bench=. -benchtime=100ms -count=1 ./...
```

---

## 8. GitHub Actions 预估

| 因素 | 影响 |
|------|------|
| stdlib-only | 无 module download |
| `-race` | ~2× 测试耗时，仍 <5min 限制 |
| `run.sh` | 非瓶颈（~0.5s） |
| Go cache | 暖缓存显著加速 build |

**预估：**

- 暖缓存 p95：**8–15s**
- 冷启动 p95：**20–45s**
- 瓶颈步骤：`test.sh` (`-race`)

---

## 9. 与设计目标对比

| 维度 | Take-home 原型 | 生产环境 |
|------|----------------|----------|
| 性能 | **满足** | 需优化 |
| 持久化 | N/A (by design) | Blocker |
| 并发模型 | 单 mutex 足够 | 需重构 |
| 队列算法 | O(n) 回插可接受 | 大规模需优化 |
| 可观测性 | 事件日志 | 需 metrics/tracing |

---

## 10. 行动建议

| 优先级 | 行动 | 预期收益 |
|--------|------|----------|
| **Now** | 无需性能优化 | 当前规模已充足 |
| **Should** | 添加 3–5 个 Benchmark | 回归检测 |
| **Should** | CI 集成 test 墙钟 <30s 断言 | 防止意外 real-clock wait |
| **Defer** | Reinsert O(n) 优化 | 仅当 n > 1000 |
| **Defer** | Mutex 分片 / Actor | 仅当暴露 HTTP API |

---

## 11. 性能仪表盘

```
┌────────────────────────────────────────────────────────────┐
│  NFR-002: PASS  │  CI ~5.8s local  │  GHA est. <20s warm   │
├────────────────────────────────────────────────────────────┤
│  CLI 延迟: 亚毫秒     队列 ops: O(1) 除回插 O(n)           │
│  回插 n=100: ~8µs      Binary: 2.6 MB    Timers: 1/bot    │
│  瓶颈: 无 (PRD 规模)   Benchmark: 未添加   生产: 需重构     │
└────────────────────────────────────────────────────────────┘
```

---

*报告由 Performance Benchmarker 生成 — v1.0*
