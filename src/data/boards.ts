// ===== 程度词板数据（说/表达 按程度裁剪）=====
// 对应 docs/患者程度自选与功能适配方案.md §3
// 展示词/整句文案都集中在此，改动一处即生效；加载时按 id 校验图符，缺失自动跳过。

import { getPictogram } from '@/data'
import type { PictogramEntry } from '@/types'

export interface LevelWord {
  /** 图符 id（须存在于 pictograms.json） */
  id: string
  /** 展示词（可覆盖图符默认标签） */
  label: string
  /** 重度：点击后朗读的整句 */
  phrase?: string
}

/** 重度 6 个最刚需词（吃/喝/去/厕所/帮/疼）——同时是接收「展示给患者」的核心词优先级来源，本体勿轻易增删 */
export const SEVERE_WORDS: LevelWord[] = [
  { id: 'p_eat', label: '吃', phrase: '我要吃饭' },
  { id: 'p_drink', label: '喝', phrase: '我要喝水' },
  { id: 'p_go', label: '去', phrase: '我要出去' },
  { id: 'p_toilet', label: '厕所', phrase: '我要上厕所' },
  { id: 'p_help_me', label: '帮', phrase: '请帮帮我' },
  { id: 'p_pain', label: '疼', phrase: '我疼' }
]

/**
 * 重度表达词板 = 刚需 6 词 + 问候礼貌 2 词（8 个超大图块）。
 * 与 SEVERE_WORDS 分开维护：接收侧核心词规则（severity-display.ts）只认刚需 6 词，
 * 避免「你好/对不起」这类社交词在接收展示时压过内容名词。
 */
export const SEVERE_EXPRESS_WORDS: LevelWord[] = [
  ...SEVERE_WORDS,
  { id: 'p_hello', label: '你好', phrase: '你好' },
  { id: 'p_sorry', label: '对不起', phrase: '对不起' }
]

/** 中度 20 个常用词（核心词 8 + 扩展词 12；2026-09 图库扩充后新增 你好/再见/对不起/辛苦） */
export const MODERATE_WORDS: LevelWord[] = [
  // 核心词
  { id: 'p_i', label: '我' },
  { id: 'p_you', label: '你' },
  { id: 'p_want', label: '要' },
  { id: 'p_dont_want', label: '不想' },
  { id: 'p_go', label: '去' },
  { id: 'p_come', label: '来' },
  { id: 'p_eat', label: '吃' },
  { id: 'p_drink', label: '喝' },
  // 扩展词
  { id: 'p_toilet', label: '厕所' },
  { id: 'p_pain', label: '疼' },
  { id: 'p_help_me', label: '帮' },
  { id: 'p_thank_you', label: '谢谢' },
  { id: 'p_good', label: '好' },
  { id: 'p_water', label: '水' },
  { id: 'p_yes_response', label: '是' },
  { id: 'p_wait', label: '等' },
  // 扩展词：2026-09 图库扩充（问候礼貌高频词）
  { id: 'p_hello', label: '你好' },
  { id: 'p_goodbye', label: '再见' },
  { id: 'p_sorry', label: '对不起' },
  { id: 'p_hard_work', label: '辛苦' }
]

const SEVERE_PHRASE_MAP: Record<string, string> = {}
for (const w of SEVERE_EXPRESS_WORDS) {
  if (w.phrase) SEVERE_PHRASE_MAP[w.id] = w.phrase
}

/** 重度点击整句：按图符 id 取预设短语（无则 undefined，走默认加词逻辑） */
export function getSeverePhrase(pictogramId: string): string | undefined {
  return SEVERE_PHRASE_MAP[pictogramId]
}

/** 解析词表为图符条目（缺失 id 自动跳过并告警；展示词覆盖到 zh[0]） */
export function resolveLevelWords(words: LevelWord[]): PictogramEntry[] {
  const result: PictogramEntry[] = []
  for (const w of words) {
    const p = getPictogram(w.id)
    if (!p) {
      console.warn('[boards] 图符缺失，已跳过:', w.id, w.label)
      continue
    }
    result.push({
      ...p,
      labels: {
        ...p.labels,
        zh: [w.label, ...p.labels.zh.filter((l) => l !== w.label)]
      }
    })
  }
  return result
}

export function resolveSevereWords(): PictogramEntry[] {
  return resolveLevelWords(SEVERE_EXPRESS_WORDS)
}

export function resolveModerateWords(): PictogramEntry[] {
  return resolveLevelWords(MODERATE_WORDS)
}
