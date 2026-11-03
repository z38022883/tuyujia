# 接收分词算法优化 · 第一版归档（两轮四次迭代）

> 归档时间：2026-11-03。本目录冻结接收（文本→图符）算法第一版优化的全部历史记录。
>
> **第一版口径声明：闭集评估。** 85 句 golden 评估集既驱动迭代开发也用于报告指标，终态召回/精度 100%（147/147）是**开发集回归指标，不代表泛化能力**；留出集泛化验证列为第二版目标。

## 一句话总结

图库 295→310，评估集 20→85 句（14 场景 × 5 类句式），匹配管线两轮四次迭代后在闭集上召回/精度双 100%，否定反转错误清零，单句匹配毫秒级。

## 时间线

| 时间 | 事件 |
|---|---|
| 2026-09-07 | 第一轮：20 条小集三次迭代（baseline v0→v1→v2，召回 74.3%→89.7%） |
| 2026-09-09 ~ 09-10 | 第二轮：评估集扩容 20→85、图库扩充 295→310、算法重构（阶段 A/B/C），闭集双 100% |
| 2026-09-11 | 汇总《接收分词两轮迭代整理》 |
| 2026-09-20 ~ 09-22 | 图 5-1 机制图定稿并嵌入申报表 |

## 本目录文档（按阅读顺序）

1. [接收分词两轮迭代整理.md](./接收分词两轮迭代整理.md) — **总览**：指标演进表、根因分类、文件地图、遗留决策
2. [图库扩充与golden评估集优化记录.md](./图库扩充与golden评估集优化记录.md) — 第二轮结果本体（评估集 schema v2、图库扩充、表达侧词板同步）
3. [接收分词算法优化方案.md](./接收分词算法优化方案.md) — 第二轮方案存档（量化目标、根因盘点、阶段 A/B/C、LLM 决策门）

## 数据集与工具（保留在 `scripts/golden/`，未移动以维持可复现）

| 文件 | 说明 |
|---|---|
| `golden-set.json` | **第一版评估数据集**：85 句 × {期望图符、替代图 altIds、禁止图 forbiddenIds、场景、句式} |
| `baseline-v0.md` / `baseline-v1.md` / `baseline-v2.md` | 第一轮三次迭代基线快照 |
| `golden-report.md` | 终态报告（147/147，按场景聚合；每次回归重新生成） |
| `run-golden.ts` + `register-alias.cjs` | 评估 harness（召回/精度/反转/反作弊） |
| `plan-evidence.mjs` | 根因证据 / 回归 diff 工具 |
| `check-golden-keys.mjs` | 关键词↔图符三层核对（无缺口/无断链/词形闭环） |
| `build-lexicon-index.cjs` + `_lexicon-index.json` | 词→图符索引（737 词） |
| `fill-arasaac-gaps.mjs` | ARASAAC 补图脚本 |
| `probe-edge-cases.ts` / `debug-segments.ts` | 边界探针 / 分词调试 |
| `图5-1_接收匹配算法机制图_v1备份.png` | 机制图初版备份 |

## 复现命令

```bash
# 1. 补图（扩图改 fill-arasaac-gaps.mjs 的 NEW 数组）
node scripts/golden/fill-arasaac-gaps.mjs

# 2. 刷新词表索引（改图库后必跑）
node scripts/golden/build-lexicon-index.cjs

# 3. 跑 golden 回归出报告
node -r ts-node/register/transpile-only -r ./scripts/golden/register-alias.cjs ./scripts/golden/run-golden.ts

# 4. 核对关键词↔图符（无缺口/无断链/词形闭环）
node scripts/golden/check-golden-keys.mjs

# 5. 根因证据 / 回归 diff
node scripts/golden/plan-evidence.mjs

# 6. 重绘申报表图5-1（接收匹配算法机制图）
python scripts/gen-algo-diagram.py
```

## 当前指标口径

见 [指标与计算方法](../指标与计算方法.md)。其中全部数值均为第一版闭集口径。

## 第一版的已知局限（第二版方向）

1. **开发集 = 报告集**：85 句参与了全部调优，100% 不可外推为泛化能力；
2. 语料与标注出自同一作者体系，无独立第二标注人；
3. 无留出测试集 / 同义改写集 / 噪声集 / 词表外（OOD）集分层；
4. 申报与答辩表述建议双口径：「闭集 100%（147/147）」+「留出集 X%」，避免裸 100%。
