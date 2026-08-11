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
  const own = getPictogramsByCategory(targetId).map((p) => ({
    type: 'pictogram' as const,
    key: `p:${p.id}`,
    pictogram: p
  }))
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

/** 取最近使用的图符（按 lastUsedAt 倒序） */
export function getRecentPictograms(limit = 24): PictogramEntry[] {
  return pictograms
    .filter((p) => (p.lastUsedAt ?? 0) > 0)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, limit)
}
