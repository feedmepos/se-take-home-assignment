# 使用说明

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 监视模式
npm run test:watch

# 构建生产版本
npm run build
```

## 操作说明

| 操作 | 按钮 | 效果 |
|------|------|------|
| 下普通单 | `＋ 普通单` | 创建普通订单，进入 PENDING 区 |
| 下 VIP 单 | `★ VIP 单` | 创建 VIP 订单，排在所有普通单前面 |
| 增加机器人 | `+ Bot` | 新增空闲机器人，自动从 PENDING 取单处理 |
| 减少机器人 | `– Bot` | 移除最新机器人；如正在处理，订单退回 PENDING |

### 机器人工作流程

1. 点击 `+ Bot` 新增机器人
2. 机器人自动从 PENDING 区取单（VIP 优先）
3. 处理 10 秒后订单自动进入 COMPLETE 区
4. 机器人继续处理下一个 PENDING 订单
5. 如 PENDING 区为空，机器人进入 IDLE 状态
6. 再次点击下订单，IDLE 机器人自动接单

## 部署到 Vercel

### 方式一：CLI

```bash
npm i -g vercel
vercel deploy --prod
```

### 方式二：Git 自动部署

1. 推送代码到 GitHub 仓库
2. 在 [vercel.com](https://vercel.com) 导入该仓库
3. 框架选择 **Vite**
4. 构建命令：`npm run build`
5. 输出目录：`dist`
6. 部署完成自动获得 `*.vercel.app` 域名

## 技术要求

- Node.js 18+
- 纯前端，无需后端服务
- 所有数据在内存中，刷新页面后重置
