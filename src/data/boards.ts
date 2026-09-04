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

/** 重度 6 个最刚需词（吃/喝/去/厕所/帮/疼） */
export const SEVERE_WORDS: LevelWord[] = [
  { id: 'p_eat', label: '吃', phrase: '我要吃饭' },
  { id: 'p_drink', label: '喝', phrase: '我要喝水' },
  { id: 'p_go', label: '去', phrase: '我要出去' },
  { id: 'p_toilet', label: '厕所', phrase: '我要上厕所' },
  { id: 'p_help_me', label: '帮', phrase: '请帮帮我' },
  { id: 'p_pain', label: '疼', phrase: '我疼' }
]

/** 中度 16 个常用词（核心词 8 + 扩展词 8，初版名单可调） */
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
  { id: 'p_wait', label: '等' }
]

const SEVERE_PHRASE_MAP: Record<string, string> = {}
for (const w of SEVERE_WORDS) {
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
  return resolveLevelWords(SEVERE_WORDS)
}

export function resolveModerateWords(): PictogramEntry[] {
  return resolveLevelWords(MODERATE_WORDS)
}
