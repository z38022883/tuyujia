// ===== 康复训练等级元信息（与题库解耦，主包可安全引用）=====
// 拆分原因：data/rehab/index.ts 引入 ~190K 题库 JSON，主包页面（首页/我的/评估入口）
// 只需要等级元信息；引用本模块可避免启动时解析题库（题库在首次开始训练时才加载）。
// 源自 docs/产品方案/康复分级文献笔记.md 分级方案。

import type { RehabDimension, RehabLevel, RehabLevelMeta, RehabTaskType } from '@/types/rehab'

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

/** 家庭沟通支持指引（源自 docs/产品方案/康复分级文献笔记.md 每级「家庭沟通支持」） */
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

export function getRehabLevelMeta(level: RehabLevel): RehabLevelMeta {
  return REHAB_LEVEL_MAP[level]
}
