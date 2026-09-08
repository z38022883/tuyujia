# 基线 v0：接收分词 golden 回归记录

> 首次基线快照，作为 P1/P2 每一步优化的对照基准。之后每次改动算法后，
> 重新运行 `run-golden.ts` 并在此追加一版记录，对比数字变化。

- **记录日期**：2026-09-07
- **golden 集**：`scripts/golden/golden-set.json`（v1 schema，20 条，39 个有图内容词，1 个图库缺口）
- **被测代码**：`src/utils/text-to-image-matcher.ts` + `src/utils/segment-text.ts`（未修改，即 Intl.Segmenter 分词 + 5 级匹配）
- **复现命令**：
  ```
  node -r ts-node/register/transpile-only -r ./scripts/golden/register-alias.cjs ./scripts/golden/run-golden.ts
  ```
- **指标口径**：
  - 内容词召回 = 期望有图的 content 词中，被 matcher 命中正确 body/h `pictogram.id` 的数量 / 总数（含 `altIds` 视为命中）。
  - matchRate = matcher 自身输出（token 命中比例），仅参考。
  - 反作弊：句子被糊成单 token 且 matchRate=1 计 1 次。
  - 图库缺口 = expected 里 `pictogramId == null` 的 content 词（图库无对应图）。

---

## v0 结果

| 指标 | 值 |
|---|---|
| **内容词召回** | **29 / 39 = 74.3%** |
| matcher matchRate（参考） | 0.846 |
| 整句单 token 反作弊命中 | 1 |
| 图库缺口内容词 | 1（`抬`） |

## 逐条（未召回 / 预期外图）

| id | 句子 | 内容词 | 未召回 | 预期外图 |
|---|---|---|---|---|
| rec-001 | 今天吃什么 | 3/3 | — | — |
| rec-002 | 需要喝水吗 | 1/2 | `喝→p_drink` | `p_need_want` |
| rec-003 | 需要去厕所吗 | 2/2 | — | `p_need_want` |
| rec-004 | 需要吃药吗 | 1/1 | — | `p_need_want`, `p_eat` |
| rec-005 | 你头晕吗 | 2/2 | — | — |
| rec-006 | 你发烧了吗 | 2/2 | — | — |
| rec-007 | 感觉恶心吗 | 1/1 | — | — |
| rec-008 | 你头疼吗 | 1/3 | `头`, `疼` | `p_headache` |
| rec-009 | 肚子疼吗 | 2/2 | — | — |
| rec-010 | 你不舒服吗 | 1/2 | `不舒服→p_unwell` | `p_no` |
| rec-011 | 你难过吗 | 2/2 | — | — |
| rec-012 | 你害怕吗 | 2/2 | — | — |
| rec-013 | 你不开心吗 | 1/2 | `不开心→p_sad` | `p_no`, `p_happy` |
| rec-014 | 你睡了吗 | 1/2 | `睡→p_sleep` | — |
| rec-015 | 起床吧 | 1/1 | — | — |
| rec-016 | 该吃饭了 | 1/2 | `饭→p_rice` | — |
| rec-017 | 把手抬起来 | 0/1 | `手→p_hand` | `p_come` |
| rec-018 | 坐下来 | 1/1 | — | `p_come` |
| rec-019 | 我们要去医院 | 2/2 | — | `p_need_want` |
| rec-020 | 医生来看你了 | 2/4 | `来→p_come`, `看→p_see` | — |

---

## 暴露的 5 类问题（优化方向索引）

1. **否定词拆出正面词 → 语义反转**（最高优先）
   - `你·不开心·吗` → 出 `p_happy`（"不开心"被拆成"不+开心"，"开心"命中快乐图）。
   - `你不舒服吗` → 出 `p_no`，"不舒服"整体丢失。
   - 根因：分词阶段拆开否定词后，正面词单独进匹配；现有 `NEGATION_PREFIXES` 只挡了"整词包含匹配"，挡不住拆词路径。
2. **功能词误出图**：`需要/要` 系统性命中 `p_need_want`（rec-002/003/004/019）。
3. **补语/趋向误出图**：`起来`、`下来` 命中 `p_come`（rec-017/018）。
4. **分词粒度**：`头疼` 并成单 token 只出 `p_headache`，期望的"头/疼"未各自出（rec-008，受下方待复核标注影响）。
5. **整句单 token** 反作弊命中 1 次。

## 待复核的 golden 标注点

- rec-008 `头疼`：当前期望为 `头(p_head)+疼(p_pain)`，但图库有整图 `p_headache` 且算法已命中。若期望改为 `p_headache` 更贴近"给患者看的图"，该条公平性会改善。需用户拍板。

---

## 后续回归约定

- 每次算法改动后跑 `run-golden.ts`，把新数字作为下一版追加记录（`baseline-v1.md`…），与 v0 逐条比照。
- 预期外图目前不计入召回、纯粹作为诊断信息；若后续要评估"出图准确性"，可把它纳入"错误出图"审计。
- golden-set.json 变更（增句/改标注）时，注明 schema 版本，避免跨版本数字不可比。