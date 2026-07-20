# 图语家小程序迁移方案

Status: Accepted（部分决策已落地）

Date: 2026-07-20

Owner: 待定（建议技术负责人）

---

## 0. 文档目的

本文档基于对现有 Next.js Web 项目（~14,500 行代码）的代码盘点和对微信小程序生态的调研，给出小程序化的技术选型、工程估算、分工建议和风险清单。

前序讨论中存在若干事实性错误（TTS 方案、包体积限制等），本文档已基于官方文档修正。

**已落地的决策**：
- ✅ 采用 monorepo + pnpm workspaces 架构（见 [ADR-0001](../adr/0001-monorepo-with-pnpm-workspaces.md)）
- ✅ 新仓库位于 `D:/projects/tuyujia`，结构见 [项目结构文档](../architecture/monorepo-structure.md)
- ✅ 保留 Web 版本，小程序端作为独立 app 并行开发
- ✅ 抽离共享代码到 `packages/`（types、utils、stores、providers-core、storage-adapter）

---

## 1. 现状盘点

### 1.1 代码分布

| 目录 | 行数 | 平台依赖 | 可复用度 |
|---|---|---|---|
| `src/components/` | ~6,638 | 浏览器/DOM | ~30% |
| `src/utils/`（生产） | ~1,128 | 大部分纯 TS | ~70% |
| `src/utils/__tests__/` | ~2,114 | Vitest | ~60%（纯逻辑可搬） |
| `src/server/` | ~1,975 | Node.js | ~80% |
| `src/stores/` | ~375 | 纯 TS（Zustand） | ~90% |
| `src/hooks/` | ~394 | 浏览器为主 | ~30% |
| `src/providers/` | ~313 | TTS 依赖浏览器 | ~50% |
| `src/services/` | ~475 | Dexie/Http | ~40% |
| `src/repositories/` | ~230 | Dexie | ~30% |
| `src/db/` | ~185 | Dexie/IndexedDB | ~10% |
| `src/types/` | ~330 | 纯 TS | ~95% |
| `app/`（路由） | ~415 | Next.js | ~10%（API 路由薄，逻辑在 server/） |

### 1.2 关键平台依赖（迁移障碍点）

| 依赖 | 位置 | 小程序替代 |
|---|---|---|
| IndexedDB / Dexie | `src/db/`、repositories、services | 本地 storage + 云数据库 |
| Web Speech API (TTS) | `src/providers/web-speech-tts.ts` | 腾讯云 TTS 插件 / 服务端合成 |
| Service Worker | `src/utils/service-worker.ts` | 小程序无对应能力 |
| HTML5 Drag and Drop | `@dnd-kit` 依赖 | movable-view / wxs / touch 事件 |
| Tailwind CSS 4 | 全局样式 | Taro + taro-plugin-tailwind（有限制） |
| Next.js API Routes | `app/api/*` | 抽离为独立后端服务 |

---

## 2. 技术选型

### 2.1 推荐方案

| 维度 | 选型 | 理由 |
|---|---|---|
| 跨端框架 | **Taro 4（React 模式）** | 现有代码是 React，复用度最高 |
| 目标平台 | **先做微信小程序** | 用户覆盖最广，云开发生态成熟 |
| 后端 | **保留现有 Node.js 服务，抽离 Next.js** | `src/server/` 代码 ~80% 可直接复用 |
| 样式 | **taro-plugin-tailwind + WXSS** | 官方推荐方案，但有类名限制 |
| 状态管理 | **Zustand（保持不变）** | 小程序环境兼容 |
| 数据库 | **云开发数据库 + 本地 storage 分层** | 结构化数据走云，图片索引走本地 |

### 2.2 已修正的事实

#### ❌ 之前的错误 → ✅ 修正后

| 项 | 之前说法 | 实际情况 |
|---|---|---|
| TTS 方案 | 微信有 `<voice-synthesizer>` 组件 | 微信小程序**无内置 TTS**，需用腾讯云智能语音插件或服务端合成 |
| 包体积限制 | 总包 20MB | 总包 **30MB**（服务商代开发才是 20MB），主包/单分包仍 ≤ 2MB |
| Storage 限制 | 总量 10MB | 总量 10MB，**单 key ≤ 1MB**（需分片） |
| Tailwind 支持 | 完美迁移 | 官方支持但**类名有限制**（不能用 `:` `\`，需用插件转换） |

---

## 3. 关键技术方案

### 3.1 存储分层（替代 Dexie）

```
┌─────────────────────────────────────────────┐
│           应用层（stores/services）          │
└──────────────┬──────────────────────────────┘
               │ StorageAdapter 接口（packages/storage-adapter）
┌──────────────┴──────────────────────────────┐
│              StorageAdapter                  │
│  get/set/remove/clear/bulkGet/bulkSet        │
└──────────────┬──────────────────────────────┘
               │ 各端实现
   ┌───────────┴───────────┐
   ▼                       ▼
┌─────────────┐     ┌─────────────────┐
│ 本地存储     │     │ 云端存储         │
│ wx.setStorage│     │ wx.cloud.database│
│ (≤10MB)     │     │ 或后端 API       │
└─────────────┘     └─────────────────┘
```

**数据分配策略**：

| 数据类型 | 存储位置 | 理由 |
|---|---|---|
| 用户偏好（settings） | 本地 | 小数据，高频读 |
| 当前会话（conversation） | 本地 | 离线可用 |
| 图库索引（pictograms metadata） | 本地（首次同步） + CDN（图片） | 元数据 ~5MB 内可放本地 |
| 表达记录（expressions） | 云端 + 本地缓存 | 需跨设备同步 |
| 收藏短语（saved phrases） | 云端 + 本地缓存 | 需跨设备同步 |
| 图片资源 | CDN（不入包） | 主包只有 2MB |

### 3.2 TTS 方案

**方案对比**：

| 方案 | 实现 | 延迟 | 成本 | 备注 |
|---|---|---|---|---|
| A. 腾讯云智能语音插件 | 小程序后台 → 插件管理 → 添加插件 | 低 | 按调用量计费 | ⚠️ 部分账号搜不到，需提前验证 |
| B. 后端调用腾讯云 TTS API | 后端合成 MP3 → 返回 URL → innerAudioContext 播放 | 中（含网络） | 按调用量计费 | 兜底方案，最稳 |
| C. 微信同声传译插件 | 微信官方插件 | 低 | 免费 | 功能有限，可能不满足场景 |
| D. 浏览器 SpeechSynthesis（仅 Web） | 已有 | 极低 | 免费 | 仅 Web 端保留 |

**推荐**：**A + B 双路**，A 作为主路径，B 作为兜底。

### 3.3 拖拽方案（替代 dnd-kit）

| 方案 | 实现 | 推荐场景 |
|---|---|---|
| movable-view + movable-area | 小程序内置组件 | SelectionTray 简单拖拽 |
| wxs + touch 事件 | 视图层处理，性能好 | Board 复杂排序场景 |
| 纯 touch 事件 | 手动计算坐标 | 自定义交互需求 |

### 3.4 后端抽离策略

将 `app/api/*/route.ts` 的 handler 抽离为独立 Fastify 服务：

```
现：Next.js API Route → 调用 src/server/*
改：apps/server (Fastify) → 复用 src/server/*
    ↑
    小程序通过 HTTPS 调用
```

**注意**：所有 API 域名必须：
- HTTPS
- 已 ICP 备案
- 在小程序后台「服务器域名」白名单中
- 新备案域名需等待 ~3 天微信同步

---

## 4. 工程量估算（修正版）

### 4.1 总体复用率

| 层 | 估算 | 修正理由 |
|---|---|---|
| 纯 TS 逻辑 | **90%** | monorepo 共享包结构已就位 |
| 后端服务 | **75%** | API 抽离 + 域名配置 + 鉴权适配 |
| UI 组件 | **25%** | Tailwind 重写成本未充分计入 |
| 浏览器胶水层 | **10%** | 各端独立实现 |
| **整体** | **30-40%** | 偏向 30% |

### 4.2 时间估算（三人组，留 buffer）

| 阶段 | 估算 | 理由 |
|---|---|---|
| Phase 1 基建 | **2-3 周** | 加域名备案等待 |
| Phase 2 核心 | **4-5 周** | Tailwind 适配比预期难 |
| Phase 3 完善 | **3 周** | 同步联调 |
| Phase 4 收尾 | **2-3 周** | 真机测试 + 审核迭代 |
| **总计** | **11-14 周** | 约 3 个月 |

---

## 5. 分工方案

### 5.1 角色定义

| 角色 | 主负责人 | 工作量占比 | 决策权 |
|---|---|---|---|
| **A. 后端 & 基建（技术负责人）** | 待定 | 35-40% | 后端架构、API 契约、部署 |
| **B. 前端核心逻辑** | 待定 | 30-35% | StorageAdapter 接口、数据流 |
| **C. UI 组件迁移** | 待定 | 30% | 组件实现、交互方案 |

**技术负责人机制**：角色 A 作为整体技术负责人，在跨角色争议（如 StorageAdapter 接口设计、API 契约）时拥有最终决策权。

### 5.2 详细分工

#### 👤 角色 A：后端 & 基建

| 任务 | 估算 | 产出 |
|---|---|---|
| Next.js API Routes 抽离为独立服务 | 1 周 | Fastify 服务（`apps/server`） |
| Prisma + MySQL 部署 + 域名备案 | 1-2 周（含等待） | 可访问的后端 |
| 小程序云开发环境配置 | 3 天 | 云数据库、云函数 |
| TTS 服务端合成 API（兜底） | 3 天 | `/api/tts` 接口 |
| 同步服务后端适配 | 1 周 | pull/push API |
| CI/CD 流水线 | 1 周 | 自动化部署 |
| 协作 | 持续 | API 文档、契约对齐 |

#### 👤 角色 B：前端核心逻辑

| 任务 | 估算 | 产出 |
|---|---|---|
| StorageAdapter 接口设计 | **已完成** ✅ | `packages/storage-adapter/src/index.ts` |
| 共享代码搬迁（types/utils/stores） | 1 周 | `packages/*` 全部就位 |
| Providers 适配（TTS、NLG） | 1 周 | MiniProgramTTS、复用 NLG |
| Services / Repositories 改造 | 1 周 | sync-service 改造完成 |
| 测试迁移（纯逻辑部分） | 1 周 | Vitest 测试搬到 `packages/utils` |
| 小程序存储实现（wx-storage、cloud-storage） | 1 周 | `apps/miniapp/src/storage/` |

#### 👤 角色 C：UI 组件迁移

| 任务 | 估算 | 产出 |
|---|---|---|
| Taro 脚手架 + 路由结构 | 3 天 | 可运行的基础工程 |
| taro-plugin-tailwind 配置 | 2 天 | 样式方案落地 |
| 通用 UI 组件库（按钮、弹窗等） | 3 天 | 复用基础组件 |
| Express Mode 组件套 | 2 周 | PictogramGrid 等 7 个组件 |
| Receiver Mode 组件套 | 1.5 周 | ReceiverPanel 等 |
| SavedPhrases + ConversationHistory | 1 周 | 抽屉类组件 |
| Settings + Auth | 1 周 | 设置模块 |
| Emergency + Onboarding + 其他 | 1 周 | 辅助功能 |
| 拖拽方案实现（替代 dnd-kit） | 1 周 | movable-view 方案 |
| 真机测试 + 审核迭代 | 1-2 周 | 提审准备 |

---

## 6. 实施路径

```
Phase 1 — 基建搭建（Week 1-3）
  A: 后端独立部署 + 小程序云环境 + 域名备案
  B: 共享代码搬迁到 packages/*
  C: Taro 脚手架 + 路由结构 + 通用组件 + Tailwind 配置

Phase 2 — 核心功能（Week 4-8）
  A: API Routes 抽离完成 + 同步服务改造 + TTS 兜底
  B: 存储实现完成 + Providers 适配 + 数据层对接
  C: Express Mode + Receiver Mode 全部组件

Phase 3 — 完善功能（Week 9-11）
  A: CI/CD + 后端联调 + 性能优化
  B: 离线缓存策略 + 同步联调 + 测试迁移
  C: Settings + Auth + SavedPhrases + ConversationHistory

Phase 4 — 收尾（Week 12-14）
  A: 后端监控 + 安全审计
  B: 各模块集成测试 + bug fix
  C: 剩余 UI + 真机调试 + 提审
```

---

## 7. 风险清单

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| **Storage 10MB 限制** | 本地缓存溢出 | 大数据走云端，本地只存索引和偏好 |
| **Tailwind 类名限制** | 样式失效 | 用 taro-plugin-tailwind 自动转换，建立样式审查清单 |
| **TTS 插件可用性** | 部分账号搜不到腾讯云插件 | Phase 1 就验证，准备 B 方案（服务端合成） |
| **拖拽体验差异** | dnd-kit 体验无法 1:1 还原 | 用 movable-view 折中，必要时简化交互 |
| **图片资源入包** | 主包超 2MB | 图片全部 CDN，不入包 |
| **域名白名单** | 外部 API（ARASAAC、OpenAI）无法直调 | 后端代理转发 |

### 7.2 合规风险

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| **AAC 类目审核** | 可能被归为医疗器械需资质 | **明确产品定位为"教育/工具"类**，文案避免医疗用语 |
| **ICP 备案周期** | 新域名需 3 天微信同步 | Phase 1 立即启动备案 |
| **用户数据合规** | 涉及患者健康信息 | 隐私政策 + 数据加密 + 用户授权流程 |
| **AI 算法备案** | AI 调用涉及生成内容 | 评估是否触发《生成式人工智能服务管理暂行办法》 |

### 7.3 项目风险

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| **8 周时间表过于激进** | 工期延误 | 已修正为 11-14 周 |
| **三人平级无决策机制** | 技术分歧卡壳 | 指定角色 A 为技术负责人 |
| **测试迁移被忽视** | 线上质量回退 | 纯 TS 测试必须搬，UI 测试新建 |
| **Web 版与小程序版代码分叉** | 双端维护成本高 | 已通过 monorepo + 共享包缓解 |

---

## 8. 决策待办

需要团队/产品方确认的关键决策：

1. ~~**是否保留 Web 版本？**~~ ✅ 已定：保留
2. **是否使用微信云开发？** 还是自建后端？
   - 云开发：省事，但锁定微信生态
   - 自建：保留现有 Node.js 后端，跨小程序平台复用
3. **目标平台范围？**
   - 仅微信
   - 微信 + 支付宝（Taro 可一份代码出两端）
   - 微信 + 字节 + 支付宝
4. **AAC 产品定位？**
   - 教育/工具类（避开医疗资质）
   - 医疗器械类（需取证，但更专业）
5. **技术负责人由谁担任？**
   - 通常是后端/基建角色 A，但需三人达成共识

---

## 9. 参考资料

- [微信官方 - 分包加载](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)
- [微信官方 - wx.setStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)
- [微信官方 - 网络能力](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- [微信官方 - 服务类目](https://developers.weixin.qq.com/miniprogram/product/material/)
- [Taro 官方 - 使用 Tailwind CSS](https://docs.taro.zone/docs/tailwindcss)
- [Taro 官方 - movable-view](https://docs.taro.zone/docs/components/viewContainer/movable-view)
- [腾讯云 TTS](https://www.tencentcloud.com/zh/product/tts)
- [微信同声传译插件](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/extended/translator.html)

---

## 10. 相关文档

- [Monorepo 项目结构](../architecture/monorepo-structure.md)
- [ADR-0001: Monorepo with pnpm workspaces](../adr/0001-monorepo-with-pnpm-workspaces.md)
- [代码迁移映射表](./code-migration-map.md)
