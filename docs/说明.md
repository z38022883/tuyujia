# ADR-0001: Monorepo with pnpm workspaces

Date: 2026-07-20

Status: Deprecated（2026-08-11 决定改为单微信小程序工程，ADR 已撤销）

## Context

图语家当前是单一 Next.js Web 仓库（~14,500 行代码），需要扩展到微信小程序端。团队面临仓库组织选择：

1. **多仓库**：Web 仓 + 小程序仓 + 后端仓
2. **Monorepo + pnpm workspaces**：所有端共享一个仓库
3. **Monorepo + Turborepo/Nx**：在 2 的基础上加构建编排工具

核心诉求：
- Web 版与小程序版有大量共享逻辑（类型、工具函数、stores、NLG 等纯 TS 代码约 1,700 行）
- 后端业务逻辑（`src/server/` 约 1,975 行）需要从 Next.js API Routes 抽离为独立服务
- 团队 3 人，需要清晰的职责边界和并行开发能力
- 避免代码分叉导致的重复维护

## Decision

采用 **方案 2：pnpm workspaces monorepo**，不上 Turborepo/Nx。

具体结构：

```
tuyujia/
├── apps/         # 各端独立应用
│   ├── web/      # Next.js
│   ├── miniapp/  # Taro
│   └── server/   # Fastify
├── packages/     # 跨端共享代码
│   ├── types/
│   ├── utils/
│   ├── stores/
│   ├── providers-core/
│   ├── storage-adapter/
│   └── tsconfig/
└── ...
```

关键设计：
- 包命名统一 `@tuyujia/*` scope
- `packages/storage-adapter` 只定义接口，各端实现
- 依赖单向流动：`apps → packages`，`packages` 之间按层次依赖

## Consequences

### 优势

- **零代码分叉**：纯 TS 逻辑（约 1,700 行）一处维护，两端复用
- **变更原子性**：修改 `packages/types` 后两端立即可见，避免多仓同步问题
- **职责清晰**：共享代码必须放在 `packages/`，倒逼开发者思考平台无关性
- **渐进式抽离**：可以从单端先跑通，再逐步把代码搬到共享包

### 代价

- **pnpm 学习成本**：团队需熟悉 `--filter`、`workspace:*` 等语法
- **IDE 索引慢**：相比单包，TypeScript Language Server 需要解析更多文件
- **CI 配置复杂**：需要按变更路径决定哪些 app 要构建（早期可全量构建）

### 风险与缓解

| 风险 | 缓解 |
|---|---|
| 误把平台代码放进共享包 | PR review 把关；`packages/*` 依赖白名单（不能 import `next`、`@tarojs/*` 等） |
| 包之间循环依赖 | `packages/storage-adapter` 只定义接口的隔离设计；CI 加 `madge` 检测 |
| 未来 Turborepo 迁移成本 | pnpm workspaces 是 Turborepo 的基础，迁移只是叠加配置，不破坏现有结构 |

## Alternatives Considered

### Alternative A: 多仓库
- **优点**：每个仓库简单、独立部署
- **缺点**：共享代码要么发 npm 包（迭代慢），要么用 git submodule（操作复杂）；两端代码易分叉
- **否决理由**：3 人团队无法承担多仓同步成本

### Alternative B: Turborepo
- **优点**：增量构建、远程缓存
- **缺点**：3 个 app + 6 个 package 的规模，Turborepo 收益不显著
- **否决理由**：先不上，留作未来优化空间

### Alternative C: Nx
- **优点**：生成器、依赖图、最强约束力
- **缺点**：配置复杂，对 React 19 + Taro 4 这种较新栈的 preset 支持滞后
- **否决理由**：过度工程化

## References

- [pnpm workspaces 官方文档](https://pnpm.io/workspaces)
- [Turborepo 文档](https://turbo.build/repo/docs)
- [changesets 文档](https://github.com/changesets/changesets)
- 图语家项目结构详情：[`docs/architecture/monorepo-structure.md`](../architecture/monorepo-structure.md)
