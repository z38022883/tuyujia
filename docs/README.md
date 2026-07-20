# 图语家文档

本目录是图语家项目的所有文档 source of truth。

## 快速导航

### 入门
- [项目整体介绍](../README.md)
- [Monorepo 项目结构](./architecture/monorepo-structure.md) — 目录组织、命名规范、依赖方向
- [ADR-0001: 为什么选 pnpm workspaces monorepo](./adr/0001-monorepo-with-pnpm-workspaces.md)

### 小程序迁移
- [小程序迁移方案](./migration/mini-program-migration-plan.md) — 技术选型、工程估算、分工、风险
- [代码迁移映射表](./migration/code-migration-map.md) — 老仓库到新仓库的逐文件搬迁指南

### 待整理（从老仓库搬迁）

按主题归类的目录，等待从老仓库 `docs/` 搬迁内容：

- [`architecture/`](./architecture/) — 系统架构、数据流、模块边界
- [`adr/`](./adr/) — 架构决策记录
- [`migration/`](./migration/) — 小程序迁移、各端差异化方案
- [`product/`](./product/) — 产品需求、用户调研、竞品分析

## 文档规范

### 新增文档

1. **位置**：按主题放到对应子目录
2. **命名**：kebab-case（如 `code-migration-map.md`）
3. **ADR 编号**：从 `0001` 开始连续编号，文件名 `NNNN-短描述.md`
4. **元信息**：每份技术文档顶部包含 `Status`（Draft/Accepted/Deprecated）和 `Last Updated` 日期

### 从老仓库搬迁

参考 [代码迁移映射表 § 2.5](./migration/code-migration-map.md) 的归类规则。

## 文档维护原则

- **Single Source of Truth**：一份内容只在一个地方维护，避免副本
- **链接而非复制**：跨文档引用用相对链接
- **更新即提交**：决策变更时同步更新对应文档，并在 ADR 中记录变更理由
