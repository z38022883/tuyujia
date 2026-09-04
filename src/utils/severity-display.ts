// ===== 接收（听）"展示给患者"按程度的裁剪规则 =====
// 对应 docs/患者程度自选与功能适配方案.md §4

import type { PictogramEntry } from '@/types'
import { SEVERE_WORDS } from '@/data/boards'

export interface DisplayItemLike {
  token: string
  pictogram: PictogramEntry | null
}

/** 语义上更"实"的分类（名词/动作为主），用于挑选核心词 */
const CORE_CATEGORIES = new Set([
  'medical',
  'food',
  'places',
  'actions',
  'daily'
])

const SEVERE_ID_SET = new Set(SEVERE_WORDS.map((w) => w.id))

/** 只保留匹配成功的内容词（中度/重度展示用；未匹配项仅在照护者编辑阶段提示） */
export function filterContentItems<T extends DisplayItemLike>(items: T[]): T[] {
  return items.filter((i) => i.pictogram !== null)
}

/**
 * 重度展示：从已匹配内容词中取唯一"核心词"（其余词缩略展示）。
 * 规则 v1：① 命中重度 6 词优先；② 语义分类（medical/food/places/actions/daily）优先；
 * ③ 同级取靠后出现的词（句末名词更可能是询问对象）。
 */
export function pickCoreItem<T extends DisplayItemLike>(items: T[]): T | null {
  const matched = filterContentItems(items)
  if (matched.length === 0) return null

  const hitSevere = matched.find(
    (i) => i.pictogram && SEVERE_ID_SET.has(i.pictogram.id)
  )
  if (hitSevere) return hitSevere

  const domain = matched.filter(
    (i) => i.pictogram && CORE_CATEGORIES.has(i.pictogram.categoryId)
  )
  const pool = domain.length > 0 ? domain : matched
  return pool[pool.length - 1]
}
