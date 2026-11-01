/**
 * 出题引擎冒烟测试（批次 1）：
 * 1. 三档题库均非空，payload.taskType 与外层 taskType 一致；
 * 2. 同种子结果稳定（断点续训一致），跨种子顺序变化（素材轮换）；
 * 3. 维度加权生效；题型交错（无连续同题型）。
 * 批次 2 的 check-rehab-tasks.mjs 上线后本脚本可并入其覆盖。
 *
 * 用法：node -r ts-node/register/transpile-only -r ./scripts/golden/register-alias.cjs ./scripts/rehab/smoke-build-tasks.ts
 */
import { buildRehabTasks, getRehabTasksByLevel } from '@/data/rehab'
import type { RehabLevel } from '@/types/rehab'

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed += 1
}

const LEVELS: RehabLevel[] = ['severe', 'moderate', 'mild']

// 1. 题库非空 + payload 一致性
for (const lv of LEVELS) {
  const pool = getRehabTasksByLevel(lv)
  check(`${lv} 题库非空`, pool.length > 0, `${pool.length} 题`)
  const mismatch = pool.filter((t) => t.payload.taskType !== t.taskType)
  check(`${lv} payload.taskType 一致`, mismatch.length === 0, `${mismatch.length} 处不一致`)
  const dims = new Set(pool.map((t) => t.dimension))
  check(`${lv} 覆盖 4 维度`, dims.size === 4, [...dims].join(','))
}

// 2. 种子稳定性 / 轮换
for (const lv of LEVELS) {
  const a = buildRehabTasks(lv, { taskCount: 5, seed: 20261031 })
  const b = buildRehabTasks(lv, { taskCount: 5, seed: 20261031 })
  const c = buildRehabTasks(lv, { taskCount: 5, seed: 20261101 })
  check(`${lv} 同种子稳定`, JSON.stringify(a.map((t) => t.id)) === JSON.stringify(b.map((t) => t.id)))
  const differSomeSeed = LEVELS.some((x) =>
    JSON.stringify(buildRehabTasks(x, { seed: 1 }).map((t) => t.id)) !==
    JSON.stringify(buildRehabTasks(x, { seed: 2 }).map((t) => t.id))
  )
  check('跨种子存在顺序变化（素材轮换）', differSomeSeed)
  check(`${lv} 抽题数 = min(taskCount, 题库)`, a.length === Math.min(5, getRehabTasksByLevel(lv).length), `${a.length} 题`)
}

// 3. 维度加权：听理解权重拉满时全部题为听理解
const weighted = buildRehabTasks('moderate', {
  taskCount: 4,
  dimensionWeights: { listening: 10, speaking: 0, reading: 0, writing: 0 },
  seed: 20261031
})
check('维度加权生效', weighted.length > 0 && weighted.every((t) => t.dimension === 'listening'), weighted.map((t) => t.dimension).join(','))

// 4. 题型交错：无连续同题型
for (const lv of LEVELS) {
  const list = buildRehabTasks(lv, { taskCount: 6, seed: 42 })
  let adjacent = false
  for (let i = 1; i < list.length; i++) {
    if (list[i].taskType === list[i - 1].taskType) adjacent = true
  }
  check(`${lv} 题型交错`, !adjacent)
}

console.log(failed === 0 ? '\n全部通过 ✅' : `\n${failed} 项失败 ❌`)
process.exit(failed === 0 ? 0 : 1)
