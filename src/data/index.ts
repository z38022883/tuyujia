import type { Category, PictogramEntry, BoardTile } from '@/types'
import categoriesJson from './seed/categories.json'
import pictogramsJson from './seed/pictograms.json'

const categories = categoriesJson as unknown as Category[]
const pictograms = pictogramsJson as unknown as PictogramEntry[]

const pictogramById = new Map<string, PictogramEntry>()
const categoryById = new Map<string, Category>()
for (const p of pictograms) pictogramById.set(p.id, p)
for (const c of categories) categoryById.set(c.id, c)

export type GridItem =
  | { type: 'pictogram'; key: string; pictogram: PictogramEntry }
  | { type: 'category'; key: string; category: Category }
  | { type: 'savedPhrases'; key: string; label: string }
  | { type: 'recent'; key: string; label: string }

/** 所有可见分类（按 sortOrder），用于 CategoryTabs */
export function getAllCategories(): Category[] {
  return categories
    .filter((c) => !c.hidden)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getCategory(id: string): Category | undefined {
  if (id === 'root') return categoryById.get('home')
  return categoryById.get(id)
}

export function getPictogram(id: string): PictogramEntry | undefined {
  return pictogramById.get(id)
}

/** 全部图符（内存），供文本匹配等全量扫描使用 */
export function getAllPictograms(): PictogramEntry[] {
  return pictograms
}

export function getPictogramsByIds(ids: string[]): PictogramEntry[] {
  return ids
    .map((id) => pictogramById.get(id))
    .filter((p): p is PictogramEntry => Boolean(p))
}

export function getPictogramsByCategory(categoryId: string): PictogramEntry[] {
  return pictograms.filter((p) =>
    (p.categoryIds ?? [p.categoryId]).includes(categoryId)
  )
}

/**
 * 板内排序：manualOrder 有值者按值升序置前，无值者保持数组序。
 * （Array.prototype.sort 稳定，配合手动给图符标 manualOrder 即可控制非策展板的词序，
 * 如让图库扩充新增的词排到分类板顶部。）
 */
function byManualOrder(a: PictogramEntry, b: PictogramEntry): number {
  const ma = a.manualOrder ?? Number.MAX_SAFE_INTEGER
  const mb = b.manualOrder ?? Number.MAX_SAFE_INTEGER
  return ma - mb
}

function withLabelOverride(
  p: PictogramEntry,
  labelOverride?: string
): PictogramEntry {
  if (!labelOverride) return p
  return {
    ...p,
    labels: {
      ...p.labels,
      zh: [labelOverride, ...p.labels.zh.filter((t) => t !== labelOverride)]
    }
  }
}

/**
 * 解析分类板的格子。
 * 优先级：tiles 显式策展 > tileIds > linkedCategoryIds 文件夹 + categoryIds 自有图符
 * root 状态映射到隐藏的 home 板。
 */
export function resolveGridItems(categoryId: string): GridItem[] {
  const targetId = categoryId === 'root' ? 'home' : categoryId
  const cat = categoryById.get(targetId)
  if (!cat) return []

  if (cat.tiles && cat.tiles.length > 0) {
    return cat.tiles.flatMap((tile: BoardTile, index: number): GridItem[] => {
      if (tile.type === 'pictogram') {
        const p = pictogramById.get(tile.id)
        return p
          ? [
              {
                type: 'pictogram',
                key: `p:${tile.id}:${index}`,
                pictogram: withLabelOverride(p, tile.labelOverride)
              }
            ]
          : []
      }
      if (tile.type === 'category') {
        const c = categoryById.get(tile.id)
        if (!c || c.hidden) return []
        return [
          {
            type: 'category',
            key: `c:${tile.id}:${index}`,
            category: tile.labelOverride ? { ...c, name: tile.labelOverride } : c
          }
        ]
      }
      if (tile.type === 'recent') {
        return [
          {
            type: 'recent',
            key: `r:${tile.id}:${index}`,
            label: tile.labelOverride ?? '最近'
          }
        ]
      }
      return [
        {
          type: 'savedPhrases',
          key: `s:${tile.id}:${index}`,
          label: tile.labelOverride ?? '常用'
        }
      ]
    })
  }

  if (cat.tileIds && cat.tileIds.length > 0) {
    return getPictogramsByIds(cat.tileIds).map((p) => ({
      type: 'pictogram' as const,
      key: `p:${p.id}`,
      pictogram: p
    }))
  }

  const linked = (cat.linkedCategoryIds ?? []).flatMap((id) => {
    const c = categoryById.get(id)
    return c && !c.hidden
      ? [{ type: 'category' as const, key: `c:${id}`, category: c }]
      : []
  })
  const own = getPictogramsByCategory(targetId)
    .map((p) => ({
      type: 'pictogram' as const,
      key: `p:${p.id}`,
      pictogram: p
    }))
    // manualOrder 置顶（无值项保持数组序）
    .sort((a, b) => byManualOrder(a.pictogram, b.pictogram))
  return [...linked, ...own]
}

/** 记录图符使用（更新内存计数；持久化由 store 负责） */
export function bumpPictogramUsage(p: PictogramEntry): PictogramEntry {
  return {
    ...p,
    usageCount: p.usageCount + 1,
    lastUsedAt: Date.now()
  }
}

/**
 * 取最近使用的图符（按 lastUsedAt 倒序）。
 * 注：种子数组不带 lastUsedAt 且 bumpPictogramUsage 不改数组本身，此函数当前恒为空；
 * 「最近」板实际改用 getPictogramsByRecentIds 从表达历史派生，见 PictogramGrid。
 */
export function getRecentPictograms(limit = 24): PictogramEntry[] {
  return pictograms
    .filter((p) => (p.lastUsedAt ?? 0) > 0)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, limit)
}

/**
 * 按「最近使用顺序的 id 列表」解析图符（去重、跳过缺失、截断）。
 * 列表须为 新→旧 序（如 store.expressions 的 pictogramIds 扁平展开）；
 * 已持久化表达历史派生，跨会话有效。
 */
export function getPictogramsByRecentIds(ids: string[], limit = 24): PictogramEntry[] {
  const result: PictogramEntry[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) continue
    const p = pictogramById.get(id)
    if (p) {
      result.push(p)
      seen.add(id)
      if (result.length >= limit) break
    }
  }
  return result
}
