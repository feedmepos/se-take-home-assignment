## 1. 前端 UI 层修改

- [x] 1.1 OrderButtons 组件增加角色条件渲染 — 仅 `state.role === 'customer'` 时渲染面板，经理角色返回 null

## 2. Context 防御性编程

- [x] 2.1 createOrder 回调增加角色校验 — `state.role !== 'customer'` 时静默 return，不执行 dispatch

## 3. E2E 测试更新

- [x] 3.1 更新 "切换到经理角色后显示管理界面" 测试 — 将 `expect(home.newNormalOrderBtn).toBeVisible()` 改为 `expect(home.newNormalOrderBtn).not.toBeAttached()`
- [x] 3.2 更新 "经理也可以创建订单" 测试 — 改为验证经理切换到经理后，创建订单按钮不可见
- [x] 3.3 新增测试用例 "经理角色不可见创建订单面板" — 切换经理后确认 New Normal Order 和 New VIP Order 按钮不在 DOM 中
- [x] 3.4 新增测试用例 "从经理切回顾客后订单创建面板恢复" — 经理→顾客切换后确认创建订单按钮重新可见
- [x] 3.5 更新 "切换角色后订单和日志数据保持" 测试 — 移除其中通过经理创建订单的步骤（如 `await home.createNormalOrder()` 改为顾客创建）

## 4. 验证

- [x] 4.1 运行 ESLint + tsc typecheck 确认无类型/语法错误（ESLint 预存在 Node.js 版本兼容问题，非本次变更导致；代码语法已验证）
- [x] 4.2 运行完整 Playwright E2E 测试套件，确认所有测试通过（36/36 passed）
