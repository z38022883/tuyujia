# 图语家 (Tuyujia)

基于图片的 AAC（Augmentative and Alternative Communication）辅助沟通小程序，面向失语症患者及其照护者。

微信小程序端：Taro 4 + React，后端使用微信云开发（云函数 + 云数据库）。

## 快速开始

需要 Node.js >= 20 和 pnpm >= 9。

```bash
# 安装依赖
pnpm install

# 微信小程序开发（watch 模式，输出到 dist/）
pnpm dev:weapp

# 构建微信小程序
pnpm build:weapp

# H5 预览（无需微信开发者工具，可快速体验界面）
pnpm dev:h5
```

打开微信开发者工具，导入项目根目录（`miniprogramRoot` 指向 `dist/`），即可预览调试。云函数部署到云环境后，用构建环境变量注入云环境 ID：

```bash
# 替换为你的云环境 ID（云开发控制台 → 设置 → 环境 ID）
TARO_APP_CLOUD_ENV=your-env-id pnpm build:weapp
```

未设置时 `Taro.cloud.init({ env })` 的 env 为空字符串（与旧行为一致，需自行确认默认环境可用）。

## 目录结构

```
tuyujia/
├── src/                  # 小程序源码
│   ├── pages/            # 页面（表达/收藏/历史/我的/引导）
│   ├── components/       # 组件（图符网格、选择栏、候选面板等）
│   ├── store/            # Zustand 状态管理
│   ├── services/         # cloud / nlg / storage / tts 服务
│   ├── data/             # 图库 lexicon 与 seed 数据
│   ├── styles/           # 全局样式
│   └── types/            # 类型定义
├── cloudfunctions/       # 微信云函数
├── config/               # Taro 构建配置
├── docs/                 # 文档
└── project.config.json   # 微信开发者工具配置
```

## 云函数

`login` / `saveExpression` / `getExpressions` / `deleteExpression` / `savePhrase` / `getSavedPhrases` / `deletePhrase`

## License

GPL-3.0-or-later
