# FeedMe 订单控制器（前端）

React + Ant Design 实现的麦当劳订单控制流程原型。

## 快速开始

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。

生产构建：

```bash
npm run build
npm run preview
```

## 页面布局

| 左侧（用户端） | 右侧（商家端） |
|---|---|
| 发起普通 / VIP 订单 | 待处理区域、已完成区域 |
| 订单列表（订单号、VIP、状态） | 机器人列表、添加/删除机器人 |

## 业务规则

1. **订单号**：从 1 递增，全局唯一。
2. **VIP 优先级**：VIP 订单排在所有普通订单之前；多个 VIP 之间按创建顺序排队。
3. **订单状态**：等待中 → 处理中（机器人拾取）→ 已完成（处理满 10 秒）。
4. **机器人**：空闲时可从待处理队列头部取单；完成后自动取下一单。
5. **添加机器人**：新机器人立即尝试处理待处理队列中的订单。
6. **删除机器人**：若正在处理订单，计时器取消，订单回到待处理队列（按 VIP/普通优先级重新插入）。

## 目录结构

```
src/
  types.ts           # 类型与常量（处理时长 10 秒）
  orderUtils.ts      # 待处理队列插入逻辑
  useOrderSystem.ts  # 状态与定时器管理
  components/
    UserPanel.tsx    # 用户端
    MerchantPanel.tsx# 商家端
  App.tsx
```

## 部署

可部署到 Vercel、Netlify 等静态托管平台，构建目录为 `dist/`。

```bash
npm run build
# 将 dist/ 目录上传或连接 Git 仓库自动部署
```
