# 开发进度跟踪

> 设计文档:[docs/specs/2026-06-01-order-management-design.md](./specs/2026-06-01-order-management-design.md)
> 最近更新:2026-06-01

## 状态图例
✅ 完成 ｜ 🚧 进行中 ｜ ⬜ 待开始 ｜ ⏸️ 阻塞

---

## M0 设计阶段
- ✅ 分析仓库需求与 CI 约束
- ✅ 确定技术方案(后端权威 + 共享 core,WebSocket,宝塔部署)
- ✅ 编写技术设计文档
- ✅ 建立进度跟踪文档

## M1 工程脚手架
- ✅ pnpm workspaces monorepo 初始化(国内镜像源 .npmrc)
- ✅ tsconfig.base / ESLint(flat config)/ Prettier / tsup 构建
- ⬜ Husky pre-commit(留待 M6)
- ⬜ 接通 CI 脚本(build/test/run + result.txt)→ M3 完成

## M2 领域核心 + 单测(TDD)✅ 41 tests passing
- ✅ types(枚举 + PROCESSING_DURATION_MS)
- ✅ Clock(RealClock / FakeClock,支持回调内再注册定时器)
- ✅ Order 实体(受控状态迁移)
- ✅ Bot 实体(assign/finish/abort)
- ✅ OrderQueue(VIP/普通双段优先级 + requeue 退回保序)
- ✅ Kitchen 聚合根(createOrder/addBot/removeBot/dispatch/complete + 全量快照)
- ✅ 领域事件 + snapshot 类型
- ✅ 全 user story 单测(优先级 / 并发 / 删 Bot 退回 / 唯一递增 / IDLE / 计时器取消 / 事件序列)
- ✅ typecheck 干净 + tsup 构建产物 + lint 通过

## M3 CLI(result.txt)
- ⬜ 复用 core 跑预设场景
- ⬜ 事件 → 带 HH:MM:SS 的日志行
- ⬜ run.sh 接通,result.txt 通过 CI 校验

## M4 后端服务
- ⬜ Fastify + REST 命令路由
- ⬜ WS gateway(全量快照 + 事件推送)
- ⬜ KitchenService 用例编排 + 事件广播
- ⬜ 集成测试

## M5 前端(UI)
- ⬜ Vite + React + Tailwind + Zustand 脚手架
- ⬜ useWebSocket / ws+rest service
- ⬜ ControlBar / OrderBoard / BotPanel(frontend-design skill)
- ⬜ 处理中进度条 + 动效
- ⬜ 前端单测

## M6 打磨与上线
- ⬜ 覆盖率门槛
- ⬜ README 使用说明
- ⬜ 宝塔部署(h5 前端 + api 后端反代 + SSL)
- ⬜ 提交 PR 到 feedmepos
