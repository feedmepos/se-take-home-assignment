# McDonald 订单管理系统 - 项目计划

## 项目概述

**项目名称**: McDonald 自动化订单管理系统
**需求来源**: se-take-home-assignment/README.md
**创建日期**: 2026-06-25
**预计工期**: 60 分钟

---

## 一、需求是什么？

### 业务场景
McDonald's 在疫情期间转型，希望用自动化烹饪机器人替代部分人工。用户下单后，机器人自动处理订单。

### 核心功能需求（7条）

| # | 需求描述 | 优先级 |
|---|----------|--------|
| 1 | 点击 "New Normal Order" → 创建普通订单，进入 PENDING 区域 | P0 |
| 2 | 点击 "New VIP Order" → 创建 VIP 订单，进入 PENDING 区域，排在所有普通订单前、所有VIP订单后 | P0 |
| 3 | 订单编号必须唯一且递增（1, 2, 3...） | P0 |
| 4 | 点击 "+ Bot" → 创建机器人，立即开始处理 PENDING 中的订单，10秒后订单移到 COMPLETE 区域 | P0 |
| 5 | PENDING 为空时，机器人处于 IDLE（空闲）状态 | P1 |
| 6 | 点击 "- Bot" → 移除最新创建的机器人，如果正在处理订单则停止，订单返回原队列位置（保持VIP/普通优先级） | P1 |
| 7 | 无需数据持久化，所有操作在内存中进行 | P2 |

### 额外要求

**选择一：前端实现**
- 可用任意框架
- 必须部署到可公开访问的 URL
- 演示所有功能

**选择二：后端实现（推荐）**
- 必须使用 Go 或 Node.js
- CLI 应用，可在 GitHub Actions 中运行
- 必须包含 `script/` 目录：`test.sh`、`build.sh`、`run.sh`
- 所有输出写入 `result.txt`
- 时间戳格式：`HH:MM:SS`
- 遵循 GitHub Flow 提交 PR
- **交互式 CLI 是面试必需**

---

## 二、需要做成什么样？

### 用户界面效果（前端方案）

```
┌─────────────────────────────────────────────────────────┐
│                    McDonald's 订单系统                    │
├─────────────────────────────────────────────────────────┤
│  [ New Normal Order ]  [ New VIP Order ]                 │
│                                                         │
│  [+ Bot]  [- Bot]                                       │
├─────────────────────────────────────────────────────────┤
│  PENDING (待处理)                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ #1 VIP    处理中 (Bot #1)                       │   │
│  │ #2 Normal                                     │   │
│  │ #3 Normal                                     │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  COMPLETE (已完成)                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ #4 Normal  14:30:45 完成                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### CLI 交互效果（后端方案）

```
$ normal
Order #1 created (Normal) - PENDING

$ normal
Order #2 created (Normal) - PENDING

$ vip
Order #3 created (VIP) - PENDING

$ add-bot
Bot #1 created and processing Order #3 (VIP)

$ add-bot
Bot #2 created and processing Order #1 (Normal)

$ status
Bot #1: PROCESSING Order #3 (VIP) - 5s remaining
Bot #2: PROCESSING Order #1 (Normal) - 8s remaining
PENDING: Order #2 (Normal)
COMPLETE: None

$ remove-bot
Bot #2 removed. Order #1 returned to PENDING.

14:35:15 - Order #3 (VIP) COMPLETE (processed by Bot #1)
```

---

## 三、任务拆解

### 阶段一：规划（0-15分钟）

| 任务 | 负责人 | 产出物 | 时长 |
|------|--------|--------|------|
| 1.1 分析需求，确认实现方案 | Collaborator | - | 2min |
| 1.2 创建需求规格说明书 | Product Owner | docs/01-requirements.md | 5min |
| 1.3 设计技术架构 | Architect | docs/02-architecture.md | 8min |

### 阶段二：实现（15-45分钟）

| 任务 | 负责人 | 产出物 | 时长 |
|------|--------|--------|------|
| 2.1 项目初始化 | Developer | 源代码结构 | 5min |
| 2.2 实现订单管理模块 | Developer | 订单队列逻辑 | 10min |
| 2.3 实现机器人管理模块 | Developer | 机器人生命周期 | 10min |
| 2.4 实现 CLI/UI 接口 | Developer | 命令处理/界面 | 10min |
| 2.5 编写单元测试 | Developer | 测试覆盖率 ≥ 80% | 5min |
| 2.6 创建实现文档 | Developer | docs/03-implementation.md | 5min |

### 阶段三：测试（45-55分钟）

| 任务 | 负责人 | 产出物 | 时长 |
|------|--------|--------|------|
| 3.1 编写测试计划 | QA | docs/04-test-plan.md | 3min |
| 3.2 执行单元测试 | Developer | 测试结果 | 2min |
| 3.3 执行接口测试 | QA | 测试结果 | 3min |
| 3.4 端到端验收测试 | Product Owner | docs/01-acceptance-report.md | 5min |
| 3.5 生成测试报告 | QA | docs/05-test-report.md | 2min |

### 阶段四：部署（55-58分钟）

| 任务 | 负责人 | 产出物 | 时长 |
|------|--------|--------|------|
| 4.1 编写部署文档 | DevOps | docs/06-deployment.md | 3min |

### 阶段五：整合（58-60分钟）

| 任务 | 负责人 | 产出物 | 时长 |
|------|--------|--------|------|
| 5.1 审核所有文档 | Collaborator | - | 1min |
| 5.2 生成项目总结 | Collaborator | docs/99-summary.md | 1min |

---

## 四、技术方案决策

### 方案选择：后端 CLI（Go）

| 选项 | 优点 | 缺点 |
|------|------|------|
| 后端 Go | 性能好，并发处理简单，编译成单二进制 | 语法学习曲线 |
| 后端 Node.js | 快速开发，JSON处理方便 | 需要 Node 环境 |

**选择理由**：Go 编译成单个可执行文件，GitHub Actions 运行简单，性能优秀。

### 核心技术点

1. **订单队列**：使用 slice 存储，按 VIP > Normal 排序
2. **机器人调度**：goroutine + time.Timer 控制 10 秒处理时间
3. **状态管理**：内存中的结构体
4. **输出**：fmt.Println + 写入 result.txt

---

## 五、文档输出清单

| 序号 | 文件名 | 内容 | 负责人 |
|------|--------|------|--------|
| 1 | docs/00-project-plan.md | 项目计划（本文档） | Collaborator |
| 2 | docs/01-requirements.md | 需求规格说明书 | Product Owner |
| 3 | docs/02-architecture.md | 架构设计文档 | Architect |
| 4 | docs/03-implementation.md | 实现文档 | Developer |
| 5 | docs/04-test-plan.md | 测试计划 | QA |
| 6 | docs/05-test-report.md | 测试报告 | QA |
| 7 | docs/06-deployment.md | 部署文档 | DevOps |
| 8 | docs/01-acceptance-report.md | 验收报告 | Product Owner |
| 9 | docs/99-summary.md | 项目总结 | Collaborator |

---

## 六、成功标准

- [ ] 所有 7 条功能需求实现
- [ ] 订单优先级正确（VIP 优先）
- [ ] 机器人 10 秒处理时间准确
- [ ] 移除机器人时订单正确返回队列
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] result.txt 输出包含 HH:MM:SS 时间戳
- [ ] GitHub Actions 测试通过
- [ ] 所有文档齐全
