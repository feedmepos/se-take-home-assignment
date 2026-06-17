# AGENTS.md

## 项目简介
vue 3 + element-plus 前端应用 | TypeScript | pnpm

## 目录结构
src/
├── views/Home.vue # 首页
└── api/index.ts # API接口定义


## 规范
- 请严格遵循‘UI渲染层-业务逻辑层-数据访问层’分离原则

## 禁止
- 禁止在页面中调用 fetch 方法，必须在 src/api/index.ts 中定义后调用
- 禁止直接说完成了，必须通过 pnpm build 检查代码

## 常用命令
```bash
pnpm start      # 启动
pnpm build      # 构建
