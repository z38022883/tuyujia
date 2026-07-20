# @tuyujia/miniapp

微信小程序端（Taro 4 + React）。

## 初始化

首次启动需要创建 Taro 项目骨架：

```bash
# 在 apps/miniapp 目录下执行
pnpm dlx @tarojs/cli@latest init . --template=default
```

初始化后保留本目录的 `package.json` 和 `tsconfig.json`，合并依赖。

## 关键实现

- `src/storage/wx-storage.ts` — 实现 `@tuyujia/storage-adapter` 接口
- `src/storage/cloud-storage.ts` — 云数据库实现
- `src/providers/tts.ts` — 腾讯云智能语音插件 + 服务端合成兜底

## 启动

```bash
# 需要先安装并初始化微信开发者工具 CLI
pnpm dev:weapp
```

打开微信开发者工具，导入 `dist/` 目录调试。
