# 图语家 (Tuyujia)

基于图片的 AAC（Augmentative and Alternative Communication）应用，面向失语症患者及其照护者。

## 项目结构

```
tuyujia/
├── apps/                  # 各端独立应用
│   ├── web/               # Web 端 (Next.js)
│   ├── miniapp/           # 微信小程序端 (Taro)
│   └── server/            # 后端服务 (Node.js)
├── packages/              # 跨端共享代码
│   ├── types/             # 类型定义
│   ├── utils/             # 纯 TS 工具函数
│   ├── stores/            # Zustand stores
│   ├── providers-core/    # NLG、AI adapter 等纯逻辑
│   ├── storage-adapter/   # 存储抽象接口
│   └── tsconfig/          # 共享 tsconfig 预设
├── prisma/                # Prisma schema
├── docs/                  # 文档
└── scripts/               # 工具脚本
```

## 快速开始

需要 Node.js >= 20 和 pnpm >= 9。

```bash
# 安装依赖
pnpm install

# 启动 Web 端开发
pnpm dev:web

# 启动后端开发
pnpm dev:server

# 启动小程序开发（需先初始化 Taro）
pnpm dev:miniapp
```

## 文档

- [架构总览](./docs/architecture/)
- [架构决策记录 (ADR)](./docs/adr/)
- [小程序迁移方案](./docs/migration/)
- [产品需求文档](./docs/product/)

## License

GPL-3.0-or-later
