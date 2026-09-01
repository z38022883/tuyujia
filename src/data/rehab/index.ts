// ===== 康复训练数据层（框架 v0.1）=====
// 题库当前为空：分级功能完善后，按「等级 × 维度」填充 TASK_LIBRARY 即可，
// 任务引擎（TaskRunner）会自动生效，无需改页面代码。

import type {
  RehabDimension,
  RehabLevel,
  RehabLevelMeta,
  RehabTask,
  RehabTaskType
} from '@/types/rehab'
import { getPictogramsByIds } from '@/data'
import type { PictogramEntry } from '@/types'

// ===== 等级元信息（源自 docs/2.txt 分级方案）=====

export const REHAB_LEVELS: RehabLevelMeta[] = [
  {
    key: 'severe',
    label: '重度',
    aqRange: 'AQ ≤ 50',
    desc: '单音应答 · 实物指认 · 简单跟读',
    sessionHint: '每次 ≤ 20 分钟，少量多次'
  },
  {
    key: 'moderate',
    label: '中度',
    aqRange: 'AQ 51~75',
    desc: '短句跟读 · 两步指令 · 看图描述',
    sessionHint: '每次 20~30 分钟'
  },
  {
    key: 'mild',
    label: '轻度',
    aqRange: 'AQ 76~93.8',
    desc: '长句表达 · 短文复述 · 生活交谈',
    sessionHint: '每次约 30 分钟'
  }
]

export const REHAB_LEVEL_MAP: Record<RehabLevel, RehabLevelMeta> = REHAB_LEVELS.reduce(
  (acc, meta) => {
    acc[meta.key] = meta
    return acc
  },
  {} as Record<RehabLevel, RehabLevelMeta>
)

export const REHAB_DIMENSION_LABELS: Record<RehabDimension, string> = {
  listening: '听理解',
  speaking: '口语表达',
  reading: '阅读',
  writing: '书写'
}

export const REHAB_TASK_TYPE_LABELS: Record<RehabTaskType, string> = {
  'pick-from-pictograms': '听词指认',
  'match-pair': '图文配对',
  'instruction-check': '听指令执行',
  'follow-read': '跟读复述',
  'describe-picture': '看图描述',
  categorize: '词汇分类',
  'listen-recall': '听短文复述',
  'reading-comprehension': '阅读理解',
  'trace-char': '汉字临摹',
  'idiom-read': '成语朗读',
  'melody-hum': '旋律哼唱',
  'script-dialogue': '生活脚本对话'
}

/** 家庭沟通支持指引（源自 docs/2.txt 每级「家庭沟通支持」） */
export const REHAB_FAMILY_GUIDES: Record<RehabLevel, { title: string; points: string[] }> = {
  severe: {
    title: '重度 · 家庭沟通支持',
    points: [
      '多用手势、图片、实物辅助交流',
      '保持交流环境安静，减少噪音干扰',
      '每次训练 20 分钟以内，少量多次开展'
    ]
  },
  moderate: {
    title: '中度 · 家庭沟通支持',
    points: [
      '家属使用短句沟通，放慢语速',
      '每日固定时段训练，形成规律',
      '单次训练 20-30 分钟'
    ]
  },
  mild: {
    title: '轻度 · 家庭沟通支持',
    points: [
      '多开展生活化交流、外出社交练习',
      '围绕兴趣话题进行完整交谈',
      '单次训练 30 分钟，可适度增加难度'
    ]
  }
}

// ===== 题库（建设中）=====

/**
 * 题库当前为空（题目先空着）。
 * 填充示例结构：
 * {
 *   id: 't_001',
 *   taskType: 'pick-from-pictograms',
 *   title: '听词指认：杯子',
 *   level: 'moderate',
 *   dimension: 'listening',
 *   difficulty: 1,
 *   prompt: '请选出「杯子」',
 *   materials: [{ text: '杯子' }, { pictogramIds: ['p_cup', 'p_bowl', 'p_chair'] }],
 *   enabled: true
 * }
 */
const TASK_LIBRARY: RehabTask[] = []

export function getRehabTasksByLevel(level: RehabLevel): RehabTask[] {
  return TASK_LIBRARY.filter((t) => t.level === level && t.enabled)
}

/** 生成一次训练的任务列表（当前题库为空时返回空数组） */
export function buildRehabTasks(level: RehabLevel, taskCount = 5): RehabTask[] {
  return getRehabTasksByLevel(level).slice(0, taskCount)
}

export function getRehabLevelMeta(level: RehabLevel): RehabLevelMeta {
  return REHAB_LEVEL_MAP[level]
}

/** 解析素材中的图符（供题型组件渲染） */
export function resolveRehabMaterialPictograms(
  pictogramIds: string[] = []
): PictogramEntry[] {
  return getPictogramsByIds(pictogramIds)
}
