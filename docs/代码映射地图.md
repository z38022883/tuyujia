# 老仓库到新仓库代码迁移映射

Status: In Progress

Last Updated: 2026-07-20

Source: `C:/Users/井安/Desktop/作业/picinterpreter`

Target: `D:/projects/tuyujia`

---

## 1. 概述

本文档定义老仓库每个目录/文件到新仓库的迁移目标、策略和优先级，供团队执行搬迁时参照。

**迁移原则**：
- **共享优先**：能跨端的代码先进 `packages/`，再处理各端特定代码
- **先接口后实现**：`storage-adapter` 接口先定，再改 stores/services
- **Web 先行**：Web 端先跑通，再开小程序端，避免共享接口返工

---

## 2. 完整映射表

### 2.1 共享代码（迁入 `packages/`）

| 老仓库位置 | 新仓库位置 | 行数 | 迁移策略 | 优先级 |
|---|---|---|---|---|
| `src/types/` | `packages/types/src/` | ~330 | 直接搬迁，改导入路径 | **P0** |
| `src/utils/segment-text.ts` | `packages/utils/src/segment-text.ts` | 109 | 直接搬迁 | P1 |
| `src/utils/ai-resegment.ts` | `packages/utils/src/ai-resegment.ts` | 106 | 直接搬迁 | P1 |
| `src/utils/concept-disambiguation.ts` | `packages/utils/src/concept-disambiguation.ts` | 105 | 直接搬迁 | P1 |
| `src/utils/nlg-context.ts` | `packages/utils/src/nlg-context.ts` | 65 | 直接搬迁 | P1 |
| `src/utils/pictogram-order.ts` | `packages/utils/src/pictogram-order.ts` | 59 | 直接搬迁 | P1 |
| `src/utils/category-links.ts` | `packages/utils/src/category-links.ts` | 45 | 直接搬迁 | P1 |
| `src/utils/phrase-transfer.ts` | `packages/utils/src/phrase-transfer.ts` | 139 | 直接搬迁 | P1 |
| `src/utils/__tests__/*.test.ts` | `packages/utils/src/__tests__/` | ~2,114 | 直接搬迁（纯逻辑测试） | P2 |
| `src/stores/*.ts` | `packages/stores/src/` | ~375 | 改 Dexie 导入为 `@tuyujia/storage-adapter` | P2 |
| `src/providers/template-nlg.ts` | `packages/providers-core/src/template-nlg.ts` | 88 | 直接搬迁 | P2 |
| `src/providers/ai-adapter.ts` | `packages/providers-core/src/ai-adapter.ts` | 75 | 直接搬迁 | P2 |
| `src/providers/server-nlg.ts` | `packages/providers-core/src/server-nlg.ts` | 42 | 直接搬迁 | P2 |
| `src/data/lexicon.ts` | `packages/utils/src/lexicon.ts` | 178 | 直接搬迁 | P1 |

### 2.2 Web 端代码（迁入 `apps/web/`）

| 老仓库位置 | 新仓库位置 | 迁移策略 |
|---|---|---|
| `src/components/` | `apps/web/src/components/` | 直接搬迁 |
| `src/hooks/` | `apps/web/src/hooks/` | 直接搬迁 |
| `src/db/index.ts` | `apps/web/src/db/` | 改为实现 `@tuyujia/storage-adapter` 接口 |
| `src/providers/web-speech-tts.ts` | `apps/web/src/providers/` | 直接搬迁 |
| `src/services/sync-service.ts` | `apps/web/src/services/` | 改 Dexie 调用走 storage-adapter |
| `src/services/auth-service.ts` | `apps/web/src/services/` | 直接搬迁 |
| `src/repositories/` | `apps/web/src/repositories/` | 改为实现 storage-adapter |
| `src/utils/arasaac-provider.ts` | `apps/web/src/utils/` | 直接搬迁（含 fetch） |
| `src/utils/runtime-pictogram-search.ts` | `apps/web/src/utils/` | 直接搬迁（含 fetch） |
| `src/utils/generate-placeholder-svg.ts` | `apps/web/src/utils/` | 直接搬迁（含 Blob） |
| `src/utils/service-worker.ts` | `apps/web/src/utils/` | 直接搬迁 |
| `src/utils/text-to-image-matcher.ts` | `apps/web/src/utils/` | 改导入：utils 包内的纯函数走 `@tuyujia/utils` |
| `src/App.tsx` | `apps/web/src/App.tsx` | 直接搬迁 |
| `app/` | `apps/web/app/` | 直接搬迁（保留 Next.js App Router） |
| `public/` | `apps/web/public/` | 直接搬迁（含 seed 数据） |
| `next.config.*`、`tailwind.config.*` | `apps/web/` | 直接搬迁 |
| `package.json` 依赖 | `apps/web/package.json` | 拆分：Web 专用依赖搬 web，共享依赖搬 packages |

### 2.3 后端代码（迁入 `apps/server/`）

| 老仓库位置 | 新仓库位置 | 迁移策略 |
|---|---|---|
| `src/server/ai/` | `apps/server/src/ai/` | 直接搬迁 |
| `src/server/auth/` | `apps/server/src/auth/` | 改 `next/headers`、`cookies` 为 Fastify 等价物 |
| `src/server/db/prisma.ts` | `apps/server/src/db/prisma.ts` | 直接搬迁 |
| `src/server/pictograms/` | `apps/server/src/pictograms/` | 直接搬迁 |
| `src/server/sync/` | `apps/server/src/sync/` | 改 `next/headers` 为 Fastify 等价物 |
| `app/api/auth/*/route.ts` | `apps/server/src/routes/auth.ts` | 抽离 handler 到 Fastify route |
| `app/api/sync/*/route.ts` | `apps/server/src/routes/sync.ts` | 同上 |
| `app/api/ai/*/route.ts` | `apps/server/src/routes/ai.ts` | 同上 |
| `app/api/pictograms/*/route.ts` | `apps/server/src/routes/pictograms.ts` | 同上 |
| `app/api/client/*/route.ts` | `apps/server/src/routes/client.ts` | 同上 |
| `prisma/schema.prisma` | `prisma/schema.prisma`（仓库根） | 直接搬迁 |

### 2.4 小程序端代码（新建，从零开始）

| 新仓库位置 | 来源 | 迁移策略 |
|---|---|---|
| `apps/miniapp/src/storage/wx-storage.ts` | 新建 | 实现 `@tuyujia/storage-adapter`，封装 `wx.setStorageSync` |
| `apps/miniapp/src/storage/cloud-storage.ts` | 新建 | 实现 `AsyncStorage`，封装 `wx.cloud.database` |
| `apps/miniapp/src/providers/tts.ts` | 新建 | 腾讯云智能语音插件 + 服务端合成兜底 |
| `apps/miniapp/src/components/*` | 参考 `apps/web/src/components/` | 用 Taro React 重写，参考 Web 版交互逻辑 |
| `apps/miniapp/src/pages/*` | 参考 `app/page.tsx` | Taro 页面结构 |

### 2.5 文档（迁入 `docs/`）

| 老仓库位置 | 新仓库位置 | 迁移策略 |
|---|---|---|
| `docs/architecture.md` | `docs/architecture/overview.md` | 更新链接 |
| `docs/ADR-001-*.md` ~ `ADR-003-*.md` | `docs/adr/0002-*.md` ~ `docs/adr/0004-*.md` | 改编号（0001 已被 monorepo 占用） |
| `docs/mini-program-migration-plan.md` | `docs/migration/mini-program-migration-plan.md` | 已重写 |
| `docs/prd.md` | `docs/product/prd.md` | 直接搬迁 |
| `docs/tuyujia-v1-*.md` | `docs/product/` 或 `docs/architecture/` | 按主题归类 |
| `docs/*-research-*.md`、`*-survey-*.md` | `docs/product/research/` | 直接搬迁 |
| `docs/*-test-cases*.md`、`*-checklist*.md` | `docs/architecture/quality/` | 直接搬迁 |
| `CLAUDE.md` | `docs/contributing/claude-code-guide.md` | 直接搬迁 |

### 2.6 脚本与配置

| 老仓库位置 | 新仓库位置 | 迁移策略 |
|---|---|---|
| `scripts/update-seed-manifest.mjs` | `apps/web/scripts/update-seed-manifest.mjs` | Web 专用 |
| `scripts/deploy-aliyun.sh` | `scripts/deploy-aliyun.sh`（仓库根） | 通用部署 |
| `scripts/sync-env-secret.sh` | `scripts/sync-env-secret.sh` | 通用 |
| `.eslintrc.*`、`eslint.config.*` | 仓库根 + 各 package | 拆分为基础 + React/Node 扩展 |
| `vitest.config.*` | `packages/utils/vitest.config.ts` + 根 | 共享 |

---

## 3. 迁移执行顺序

```
Phase 0 — 仓库骨架（已完成 ✅）
  └── monorepo 结构、tsconfig、storage-adapter 接口已就位

Phase 1 — 共享代码搬迁（Week 1）
  ├── Step 1.1: packages/types/         (零依赖，最先搬)
  ├── Step 1.2: packages/utils/         (纯 TS 部分)
  ├── Step 1.3: packages/utils/__tests__ (验证搬迁正确性)
  ├── Step 1.4: packages/stores/        (改 Dexie 导入)
  └── Step 1.5: packages/providers-core/

Phase 2 — Web 端搬迁（Week 2）
  ├── Step 2.1: apps/web/src/db/ 改为实现 storage-adapter
  ├── Step 2.2: apps/web/src/services、repositories 改造
  ├── Step 2.3: apps/web/src/components、hooks 搬迁
  ├── Step 2.4: apps/web/app/ 路由搬迁
  └── Step 2.5: apps/web 启动验证（功能不回归）

Phase 3 — 后端抽离（Week 3-4）
  ├── Step 3.1: apps/server/ 业务逻辑搬迁（server/*）
  ├── Step 3.2: Fastify 路由层（替换 Next.js API Routes）
  ├── Step 3.3: apps/web 改调 apps/server
  └── Step 3.4: 后端独立部署

Phase 4 — 小程序端开工（Week 5+）
  ├── Step 4.1: Taro 脚手架
  ├── Step 4.2: wx-storage 实现
  ├── Step 4.3: cloud-storage 实现
  ├── Step 4.4: TTS 适配
  └── Step 4.5: UI 组件重写
```

---

## 4. 迁移验证清单

每个 phase 完成后必须通过：

### Phase 1 验证
- [ ] `pnpm typecheck` 全绿
- [ ] `pnpm --filter @tuyujia/utils test` 全绿（搬过来的测试通过）
- [ ] `packages/types` 和 `packages/utils` 无 `import` from `apps/*`

### Phase 2 验证
- [ ] `apps/web` 启动正常（`pnpm dev:web`）
- [ ] Web 端核心功能不回归（手动测试 Express Mode、Receiver Mode）
- [ ] `apps/web` 不再直接 import Dexie（统一走 storage-adapter）

### Phase 3 验证
- [ ] `apps/server` 独立启动
- [ ] Web 端改调 `apps/server` 后功能正常
- [ ] 后端 API 通过 HTTPS 域名访问

### Phase 4 验证
- [ ] 小程序端基础功能跑通（选图 → 生成句子 → TTS）
- [ ] 数据同步正常（小程序 ↔ 后端）

---

## 5. 迁移注意事项

### 5.1 导入路径变更

搬迁后需要批量替换导入路径：

```ts
// 旧（老仓库）
import { Category } from '@/types/category';
import { segmentText } from '@/utils/segment-text';

// 新（新仓库，跨端共享）
import type { Category } from '@tuyujia/types';
import { segmentText } from '@tuyujia/utils';
```

### 5.2 测试文件位置

- **纯逻辑测试**（不依赖浏览器/Node API）→ `packages/utils/src/__tests__/`
- **Web 端组件测试** → `apps/web/src/**/__tests__/`
- **后端测试** → `apps/server/src/**/__tests__/`

### 5.3 环境变量

老仓库的 `.env` 拆分：
- 数据库连接、AI 密钥 → `apps/server/.env`
- Next.js 公开变量 → `apps/web/.env.local`
- 小程序配置 → `apps/miniapp/project.config.json`

### 5.4 Git 历史

按用户要求不保留 git 历史。搬迁时直接 `cp -r`（或 Windows 下 `xcopy`）。

---

## 6. 相关文档

- [Monorepo 项目结构](../architecture/monorepo-structure.md)
- [小程序迁移方案](./mini-program-migration-plan.md)
- [ADR-0001: Monorepo with pnpm workspaces](../adr/0001-monorepo-with-pnpm-workspaces.md)
