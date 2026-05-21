# App Knowledge — mcOrder

Generated: 2026-05-21T18:42:00Z
Last updated: 2026-05-21T18:55:00Z

Cross-change E2E knowledge. Updated by Step 4 exploration, read by Step 5/6.

## Routes

Discovered routes from sitemap.xml or link extraction. Used by "all" mode to generate Page Objects.

| Route | Auth | Page Object | Notes |
|-------|------|-------------|-------|
| `/` | none | `HomePage.ts` | 单页 SPA，React 18 + Vite，角色切换为前端 toggle |

## Credential Format

无需认证 — 应用无登录系统，角色切换为前端按钮 toggle。

## Common Selector Patterns

Priority: `getByRole` > `getByText` > CSS (项目无 data-testid)

### Buttons

| Element | Selector | Notes |
|---------|----------|-------|
| 角色切换 | `getByRole('button', { name: '顾客' })` / `getByRole('button', { name: '经理' })` | |
| 创建订单 | `getByRole('button', { name: 'New Normal Order' })` / `getByRole('button', { name: 'New VIP Order' })` | |
| 机器人管理 | `getByRole('button', { name: '+ Bot' })` / `getByRole('button', { name: '- Bot' })` | 仅经理可见 |

### Headings

| Element | Selector | Notes |
|---------|----------|-------|
| 主标题 | `getByRole('heading', { name: "McDonald's 订单追踪系统" })` | h1 |
| 创建订单 | `getByRole('heading', { name: '创建订单' })` | h3 |
| 机器人管理 | `getByRole('heading', { name: '机器人管理' })` | h3，仅经理 |
| PENDING | `getByRole('heading', { name: /PENDING/ })` | h2 |
| COMPLETE | `getByRole('heading', { name: /COMPLETE/ })` | h2 |
| 活动日志 | `getByRole('heading', { name: /活动日志/ })` | h3，仅经理 |

### 空状态

| Element | Selector | Notes |
|---------|----------|-------|
| 无待处理订单 | `getByText('暂无待处理订单')` | |
| 无已完成订单 | `getByText('暂无已完成订单')` | |
| 无机器人 | `getByText('暂无机器人')` | 仅经理 |
| 无日志 | `getByText('暂无日志')` | 仅经理 |

### 动态内容

| Element | Selector | Notes |
|---------|----------|-------|
| 订单卡片 | `getByText(/#\d+/)` | 使用 toContainText 或正则 |
| 订单类型标签 | `getByText(/Normal|VIP/)` | |
| 机器人状态 | `getByText(/机器人 #\d+ —/)` | 空闲或处理中 |
| 日志条目 | `getByText(/订单 #\d+|机器人 #\d+/)` | 动态编号 |

## Architecture

| Aspect | Value | Notes |
|--------|-------|-------|
| Architecture | monolith (纯前端) | React SPA，无后端 |
| Backend server | 无 | 纯前端应用 |
| Dev server | `cd mc-order-app && npm run dev` | Vite，端口 5173 |

## SPA Routing

- Framework: 无路由库（单页应用）
- URL changes without page reload: 否
- History API: 否
- Hash routing: 否

## Dynamic Content Conventions

- 订单号自增，不可断言具体编号，使用正则
- 时间戳格式 HH:MM:SS，使用正则匹配
- 日志消息含动态编号，使用 `toContainText`
- 处理时间 10 秒，需等待异步操作完成

## Project Conventions

| Convention | Value | Notes |
|------------|-------|-------|
| BASE_URL | `http://localhost:5173` | Vite 默认端口 |
| auth method | 无 | 角色切换为前端 toggle |
| multi-user roles | 顾客, 经理 | 前端切换，无真实认证 |

## Selector Fixes (Healer memory)

Persists selector repairs across sessions. Prevents the same selector from being healed repeatedly.

| Date | Route | Old Selector | New Selector | Reason |
|------|-------|-------------|-------------|--------|
| 2026-05-21 | `/` | `getByText('/订单 #\\d+/')` (全局) | `page.locator('.log-msg.create')` | 经理视图下 bot 状态和日志也匹配订单编号 |
| 2026-05-21 | `/` | `getByText('Normal')` (全局) | `page.locator('.order-type').first()` | "New Normal Order" 按钮也包含 Normal 文本 |
| 2026-05-21 | `/` | `getByText('VIP')` (全局) | `page.locator('.order-type').first()` | "New VIP Order" 按钮也包含 VIP 文本 |
| 2026-05-21 | `/` | `getByText(/#\\d+/)` (全局) | `page.locator('.order-card .order-id')` | 日志消息中也包含订单编号 |
| 2026-05-21 | `/` | `[class*="pending"]` CSS | `page.locator('.order-area').first()` | 部分属性选择器不匹配 React 渲染的类名 |
| 2026-05-21 | `/` | `getByText(/机器人 #1/)` (全局) | `getByText(/机器人 #1 — (空闲|处理中)/)` | 日志条目也匹配机器人编号 |

---

## Assertion Fixes (Healer memory)

Persists assertion repairs (typos, spec drift) across sessions.

| Date | Test | Old Assertion | New Assertion | Reason |
|------|------|-------------|-------------|--------|
| | | | | |

---

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-05-21 | 初始探索，发现 1 条路由（/） | E2E |
| 2026-05-21 | E2E 测试生成 + 修复：30 个测试全部通过 | E2E |

---

> **Updating this file**: After each E2E exploration (Step 4), extract new shared patterns and update this file. Generator (Step 6) reads this before writing tests. After Healer repairs (Step 9): append selector fixes to **Selector Fixes** table, append assertion fixes to **Assertion Fixes** section.
