# App Exploration — mc-order-tracking-system

Generated: 2026-05-21T18:42:00Z

## Routes

| Route | Auth | Status | Notes |
|-------|------|--------|-------|
| `/` | none | ✅ Explored | 单页 SPA，React 18 + Vite |

## Route: `/` (Home)

- **URL**: `http://localhost:5173/`
- **Auth**: 无需认证 — 角色切换为前端 toggle（顾客/经理）
- **Ready signal**: heading "McDonald's 订单追踪系统" 可见
- **Framework**: React 18，无路由库

### Elements

#### Header
| Element | Selector | Notes |
|---------|----------|-------|
| 标题 | `getByRole('heading', { name: "McDonald's 订单追踪系统" })` | h1 |
| 顾客按钮 | `getByRole('button', { name: '顾客' })` | RoleSwitcher，默认激活 |
| 经理按钮 | `getByRole('button', { name: '经理' })` | RoleSwitcher |

#### Control Panel — OrderButtons（所有角色）
| Element | Selector | Notes |
|---------|----------|-------|
| 创建订单标题 | `getByRole('heading', { name: '创建订单' })` | h3 |
| New Normal Order | `getByRole('button', { name: 'New Normal Order' })` | 创建普通订单 |
| New VIP Order | `getByRole('button', { name: 'New VIP Order' })` | 创建 VIP 订单 |

#### Control Panel — BotManager（仅经理角色可见）
| Element | Selector | Notes |
|---------|----------|-------|
| 机器人管理标题 | `getByRole('heading', { name: '机器人管理' })` | h3 |
| + Bot 按钮 | `getByRole('button', { name: '+ Bot' })` | 增加机器人 |
| - Bot 按钮 | `getByRole('button', { name: '- Bot' })` | 减少机器人，无机器人时 disabled |
| 机器人状态 | `getByText(/机器人 #\d+ —/)` | 显示空闲/处理中状态 |
| 暂无机器人 | `getByText('暂无机器人')` | 空状态 |

#### PendingArea
| Element | Selector | Notes |
|---------|----------|-------|
| PENDING 标题 | `getByRole('heading', { name: /PENDING/ })` | 含订单数量 |
| 暂无待处理订单 | `getByText('暂无待处理订单')` | 空状态 |
| 订单卡片 | `getByText(/#\d+/)` + 相邻的类型标签 Normal/VIP | VIP 在前，Normal 在后 |

#### CompleteArea
| Element | Selector | Notes |
|---------|----------|-------|
| COMPLETE 标题 | `getByRole('heading', { name: /COMPLETE/ })` | 含订单数量 |
| 暂无已完成订单 | `getByText('暂无已完成订单')` | 空状态 |
| 订单卡片 | `getByText(/#\d+/)` + 相邻的类型标签 Normal/VIP | 按完成时间排序 |

#### ActivityLog（仅经理角色可见）
| Element | Selector | Notes |
|---------|----------|-------|
| 活动日志标题 | `getByRole('heading', { name: /活动日志/ })` | 含日志数量 |
| 暂无日志 | `getByText('暂无日志')` | 空状态 |
| 日志条目 | 时间戳 (HH:MM:SS) + 事件描述文本 | 倒序排列（最新在上） |

### Interactive Element Summary (from snapshots)

**顾客视图** (`ref: e7` active):
- 创建订单区: New Normal Order (e13), New VIP Order (e14)
- 机器人管理区: 仅显示状态（无 +/- 按钮）
- PENDING 区域
- COMPLETE 区域
- 活动日志面板不可见

**经理视图** (`ref: e8` active):
- 创建订单区: New Normal Order (e13), New VIP Order (e14)
- 机器人管理区: + Bot (e108), - Bot (e109), 机器人状态列表
- PENDING 区域
- COMPLETE 区域
- 活动日志面板可见 (e110)

### Dynamic Content Conventions

- 订单号递增（#1, #2, #3...），不可断言具体编号
- 时间戳格式 `HH:MM:SS`，使用正则匹配
- 日志消息包含动态编号（订单号、机器人号），使用 `toContainText` 而非 `toHaveText`
- 处理时间 10 秒，测试中可能需要等待
- 机器人状态实时更新（空闲 ↔ 处理中）

### Screenshots

- `__screenshots__/manager-view.png` — 经理视图（空状态 + 1 个机器人）
- `__screenshots__/manager-final.png` — 经理视图（有订单、有日志）

### Special Elements Detected

无特殊元素（无 canvas、iframe、CAPTCHA、OTP、文件上传等）。

### Visual Anomalies

无（VLM 未配置，跳过 vision check）。
