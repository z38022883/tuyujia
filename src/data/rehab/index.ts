// ===== 康复训练数据层（v0.2：题库 + 出题引擎）=====
// 题库来源：
// - tasks.manual.json：手写种子/叙事题（指令、短文、脚本、成语、临摹、哼唱等）
// - tasks.generated.json：生成器产物（scripts/gen-rehab-tasks.mjs）
// 任务引擎（TaskRunner）按 payload.taskType 分发到题型组件，题库填充后自动生效。
//
// 等级元信息拆分在 ../rehab-meta.ts（无题库依赖，主包页面引用它可免启动解析题库）；
// 这里 re-export 保持既有 import 路径（康复分包页面/TaskRunner）不变。

import type {
  RehabDimension,
  RehabLevel,
  RehabTask,
  RehabTaskType
} from '@/types/rehab'
import generatedTasksJson from './tasks.generated.json'
import manualTasksJson from './tasks.manual.json'

// 元信息（REHAB_LEVELS / REHAB_LEVEL_MAP / REHAB_DIMENSION_LABELS / REHAB_TASK_TYPE_LABELS /
// REHAB_FAMILY_GUIDES / getRehabLevelMeta）来自 rehab-meta
export * from '../rehab-meta'

// ===== 题库 =====

const TASK_LIBRARY: RehabTask[] = [
  // 生成题（scripts/gen-rehab-tasks.mjs，结构化题型）+ 手写题（叙事题型），
  // 校验与覆盖矩阵见 scripts/check-rehab-tasks.mjs → docs/产品方案/康复题库覆盖矩阵.md
  ...(generatedTasksJson as unknown as RehabTask[]),
  ...(manualTasksJson as unknown as RehabTask[])
]

export function getRehabTasksByLevel(level: RehabLevel): RehabTask[] {
  return TASK_LIBRARY.filter((t) => t.level === level && t.enabled)
}

// ===== 出题引擎 =====

/** 名额按权重分配（最大余数法），总和恰为 total */
function allocateCounts(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0 || total <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (w * total) / sum)
  const counts = raw.map((v) => Math.floor(v))
  let rest = total - counts.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (rest <= 0) break
    counts[i] += 1
    rest -= 1
  }
  return counts
}

/** 确定性伪随机（mulberry32）：同种子出同序列 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 种子洗牌（Fisher-Yates）：同日稳定（断点续训一致）、跨日轮换（素材轮换） */
function seededShuffle<T>(list: T[], seed: number): T[] {
  const arr = [...list]
  const rand = mulberry32(seed)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 题型多样化：同一题型不超过 ceil(n/2)（无相邻同题型的可行性上界）。
 * 超出者用「同维度其他题型」余量替换，不足再跨维度找；无余量则接受现状
 * （题库单一题型的维度，如书写的临摹题）。全程确定性。
 */
function diversifyTypes(
  picked: RehabTask[],
  sparesByDim: Map<RehabDimension, RehabTask[]>,
  dims: RehabDimension[],
  cap: number
): RehabTask[] {
  const out = [...picked]
  const chosen = new Set(out.map((t) => t.id))
  const countOf = (type: string) => out.filter((t) => t.taskType === type).length

  for (let guard = 0; guard < out.length; guard++) {
    const overType = [...new Set(out.map((t) => t.taskType))].find((type) => countOf(type) > cap)
    if (!overType) break

    // 找该题型最后出现的位置（保持前面的选择稳定）
    let idx = -1
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].taskType === overType) {
        idx = i
        break
      }
    }
    const victim = out[idx]
    // 替换候选：优先同维度，再跨维度；不同题型且替换后不超限额
    const tryDims = [victim.dimension, ...dims]
    let rep: RehabTask | null = null
    for (const d of tryDims) {
      const spares = sparesByDim.get(d) ?? []
      const j = spares.findIndex(
        (s) => !chosen.has(s.id) && s.taskType !== overType && countOf(s.taskType) < cap
      )
      if (j >= 0) {
        rep = spares.splice(j, 1)[0]
        break
      }
    }
    if (!rep) break // 无余量可用，接受该题型占比偏高
    out.splice(idx, 1)
    chosen.delete(victim.id)
    chosen.add(rep.id)
    out.push(rep)
  }
  return out
}

/**
 * 按题型交错排列：每步取「剩余最多且与上一题不同」的题型（贪心）。
 * 当最大题型数 ≤ 其余之和 +1 时保证零相邻同题型；题库单一题型时退化为顺序输出。
 */
function interleaveByType(tasks: RehabTask[]): RehabTask[] {
  const queues = new Map<RehabTaskType, RehabTask[]>()
  for (const t of tasks) {
    const g = queues.get(t.taskType) ?? []
    g.push(t)
    queues.set(t.taskType, g)
  }
  const out: RehabTask[] = []
  let last: RehabTaskType | undefined
  while (out.length < tasks.length) {
    let bestType: RehabTaskType | undefined
    let bestQueue: RehabTask[] | undefined
    for (const [type, q] of queues) {
      if (q.length === 0 || type === last) continue
      if (!bestQueue || q.length > bestQueue.length) {
        bestType = type
        bestQueue = q
      }
    }
    if (!bestType || !bestQueue) {
      // 只剩同一种题型：接受相邻
      for (const [type, q] of queues) {
        if (q.length > 0) {
          out.push(q.shift()!)
          last = type
          break
        }
      }
      continue
    }
    out.push(bestQueue.shift()!)
    last = bestType
  }
  return out
}

function todaySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export interface BuildRehabTasksOptions {
  /** 本次会话任务数（默认 5） */
  taskCount?: number
  /** 维度权重（短板维度更高；缺省维度按 1 参与，0 表示跳过该维度） */
  dimensionWeights?: Partial<Record<RehabDimension, number>>
  /** 抽题种子（默认=当日日期：同日稳定、跨日轮换） */
  seed?: number
}

/**
 * 生成一次训练的任务列表：
 * 按维度分名额（无权重均分）→ 每维度内种子洗牌抽取 → 题型限额多样化 → 题型交错排列。
 * 题库为空或某维度无题时自动把名额让给其余维度。
 */
export function buildRehabTasks(
  level: RehabLevel,
  opts: BuildRehabTasksOptions = {}
): RehabTask[] {
  const { taskCount = 5, dimensionWeights, seed = todaySeed() } = opts
  const pool = getRehabTasksByLevel(level)
  if (pool.length === 0) return []

  const byDim = new Map<RehabDimension, RehabTask[]>()
  for (const t of pool) {
    const g = byDim.get(t.dimension) ?? []
    g.push(t)
    byDim.set(t.dimension, g)
  }
  const dims = [...byDim.keys()]
  const weights = dims.map((d) => {
    const w = dimensionWeights?.[d]
    return w === undefined ? 1 : w
  })
  const counts = allocateCounts(Math.min(taskCount, pool.length), weights)

  const picked: RehabTask[] = []
  const sparesByDim = new Map<RehabDimension, RehabTask[]>()
  dims.forEach((d, i) => {
    const dimPool = byDim.get(d) ?? []
    const want = Math.min(counts[i], dimPool.length)
    if (want <= 0) {
      sparesByDim.set(d, [])
      return
    }
    // 维度名 hash 进种子，避免各维度共用同一种子序列
    const dimSalt = [...d].reduce((n, ch) => n + ch.charCodeAt(0), 0)
    const shuffled = seededShuffle(dimPool, seed + dimSalt)
    picked.push(...shuffled.slice(0, want))
    sparesByDim.set(d, shuffled.slice(want))
  })

  // 题型多样化 + 交错排列（同一题型最多 ceil(n/2)，防「背题」与单调）
  const diversified = diversifyTypes(picked, sparesByDim, dims, Math.ceil(Math.min(taskCount, pool.length) / 2))
  return interleaveByType(seededShuffle(diversified, seed))
}
