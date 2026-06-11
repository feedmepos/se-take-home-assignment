# 文档导航

> 文档驱动开发：设计先于代码落地，作为实现与验收的依据。代码行为有调整时，必须回写对应文档。

| 目录 | 内容 |
|------|------|
| [00-overview](00-overview/README.md) | 项目入口：快速上手、构建与运行 |
| [10-context](10-context/README.md) | 背景：需求、验收标准、非目标 |
| [20-architecture](20-architecture/README.md) | 架构：模块划分、分层与职责边界 |
| [30-design](30-design/README.md) | 详细设计：领域模型、队列、流程、并发、测试 |
| [40-api](40-api/README.md) | 对外契约：CLI 命令集与参数 |
| [50-deployment](50-deployment/README.md) | 交付：脚本与 CI 校验 |
| [80-decisions](80-decisions/README.md) | 架构决策记录（ADR） |

## 推荐阅读顺序

1. 新人 / 面试官：`00-overview` → `10-context` → `20-architecture`
2. 改代码前：对应的 `30-design` 章节 + `80-decisions`
3. 提 PR 前：`50-deployment/ci-verification.md`
