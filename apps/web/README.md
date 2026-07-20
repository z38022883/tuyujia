# @tuyujia/web

Web 端应用（Next.js 15）。

## 迁移来源

从老仓库 `picinterpreter` 整体迁移：
- `src/components/` → 本目录 `src/components/`
- `src/hooks/` → 本目录 `src/hooks/`
- `src/db/` (Dexie) → 本目录 `src/db/`（作为 storage-adapter 的实现）
- `app/` (Next.js App Router) → 本目录 `app/`
- `public/` → 本目录 `public/`

## 启动

```bash
pnpm dev
```

打开 http://localhost:3001
