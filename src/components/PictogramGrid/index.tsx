import { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useAppStore } from '@/store/useAppStore'
import { useProfileStore } from '@/store/useProfileStore'
import {
  resolveGridItems,
  getPictogramsByRecentIds,
  getCategory,
  type GridItem
} from '@/data'
import {
  resolveSevereWords,
  resolveModerateWords,
  getSeverePhrase
} from '@/data/boards'
import type { PictogramEntry } from '@/types'
import PictogramCard from '@/components/PictogramCard'
import FolderTile from '@/components/FolderTile'
import EmptyState from '@/components/EmptyState'
import HierarchyNavRail from '@/components/HierarchyNavRail'
import styles from './index.module.scss'

/** 分类主题色（迁移自原版 PictogramGrid 的 CATEGORY_COLORS） */
const CATEGORY_COLORS: Record<string, string> = {
  quickchat: '#1d4ed8',
  actions: '#16a34a',
  repair: '#7c3aed',
  emotions: '#ea580c',
  food: '#dc2626',
  people: '#7c3aed',
  places: '#0891b2',
  medical: '#0d9488',
  time: '#d97706',
  activities: '#2563eb',
  animals: '#65a30d',
  colors: '#db2777',
  daily: '#4A90D9',
  objects: '#8E44AD',
  descriptors: '#0ea5e9'
}

/** root 板上图符使用的强调色（对应原版 isRoot 时的 #d97706） */
const ROOT_COLOR = '#d97706'

interface Props {
  /**
   * true = 完整图库模式（中度/重度的「更多词」入口进入）：
   * 不受程度裁剪，恢复全量词板与文件夹导航。
   */
  full?: boolean
}

/**
 * 主网格组件。
 *
 * 按患者程度（轻度/中度/重度）裁剪 root 词板内容与图块尺寸：
 * - 轻度：现状全量板（策展词 + 文件夹 + 常用）；
 * - 中度：16 个常用词大卡（「更多词」进完整图库）；
 * - 重度：6 个超大词，点一下直接朗读预设整句（无文件夹）。
 * 非 root（分类内）与 full 模式下保持原逻辑。
 */
function PictogramGrid({ full = false }: Props) {
  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const categoryPath = useAppStore((s) => s.categoryPath)
  const openCategory = useAppStore((s) => s.openCategory)
  const goBackCategory = useAppStore((s) => s.goBackCategory)
  const goRootCategory = useAppStore((s) => s.goRootCategory)
  const addPictogram = useAppStore((s) => s.addPictogram)
  const speakSentence = useAppStore((s) => s.speakSentence)
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)
  const expressions = useAppStore((s) => s.expressions)
  const severity = useProfileStore((s) => s.profile?.severity ?? null)

  const isRoot = activeCategoryId === 'root'
  const isRecent = activeCategoryId === 'recent'
  // 程度适配仅作用于 首页板(root) 且非完整图库模式
  const adaptive = !full && isRoot && severity !== null && severity !== 'mild'
  const adaptiveWords = adaptive
    ? severity === 'severe'
      ? resolveSevereWords()
      : resolveModerateWords()
    : []

  const targetId = isRoot ? 'home' : activeCategoryId
  const activeCategory = getCategory(targetId)

  const items = useMemo<GridItem[]>(() => {
    if (adaptive) {
      return adaptiveWords.map((p, index) => ({
        type: 'pictogram' as const,
        key: `p:${p.id}:${index}`,
        pictogram: p
      }))
    }
    if (isRecent) {
      // 最近使用：从表达历史（store.expressions 已按 新→旧 持久化）派生，去重取前 24
      return getPictogramsByRecentIds(
        expressions.flatMap((e) => e.pictogramIds),
        24
      ).map((p) => ({
        type: 'pictogram' as const,
        key: `p:${p.id}`,
        pictogram: p
      }))
    }
    return resolveGridItems(activeCategoryId)
  }, [adaptive, adaptiveWords, activeCategoryId, isRecent, expressions])

  const color = isRoot ? ROOT_COLOR : (CATEGORY_COLORS[activeCategoryId] ?? '#4A90D9')
  const title = adaptive
    ? severity === 'severe'
      ? '最常用词'
      : '常用词'
    : isRoot
      ? '首页'
      : isRecent
        ? '最近'
        : (activeCategory?.name ?? '未找到')
  const canGoBack = categoryPath.length > 0

  // 词板图块尺寸档：重度超大(xl) / 中度大(lg) / 其余常规
  const tileSize = adaptive
    ? severity === 'severe'
      ? 'xl'
      : 'lg'
    : 'default'
  const cellClass =
    adaptive && severity === 'severe'
      ? `${styles.cell} ${styles.cellXl}`
      : styles.cell

  function handleSelect(p: PictogramEntry) {
    // 重度简易词板：点一下 = 朗读预设整句（不进入句条）
    if (adaptive && severity === 'severe') {
      const phrase = getSeverePhrase(p.id)
      if (phrase) {
        speakSentence(phrase, [p.id])
        return
      }
    }
    addPictogram(p)
  }

  return (
    <View className={styles.grid}>
      {/* 顶部标题栏 */}
      <View className={styles.header}>
        <Text className={styles.title}>{title}</Text>
      </View>

      <View className={styles.body}>
        {!isRoot && (
          <HierarchyNavRail
            canGoBack={canGoBack}
            onGoRoot={goRootCategory}
            onGoBack={goBackCategory}
          />
        )}

        <ScrollView scrollY className={styles.scroll}>
          <View className={styles.gridInner}>
            {items.map((item) => {
              if (item.type === 'pictogram') {
                return (
                  <View key={item.key} className={cellClass}>
                    <PictogramCard
                      pictogram={item.pictogram}
                      color={color}
                      size={tileSize}
                      onClick={handleSelect}
                    />
                  </View>
                )
              }

              if (item.type === 'category') {
                return (
                  <View key={item.key} className={styles.cell}>
                    <FolderTile
                      category={item.category}
                      onClick={(c) => openCategory(c.id)}
                    />
                  </View>
                )
              }

              // 最近使用入口
              if (item.type === 'recent') {
                return (
                  <View key={item.key} className={styles.cell}>
                    <View
                      className={styles.actionTile}
                      onClick={() => openCategory('recent')}
                    >
                      <Text className={styles.actionIcon}>🕑</Text>
                      <Text className={styles.actionLabel}>{item.label}</Text>
                    </View>
                  </View>
                )
              }

              // savedPhrases 入口
              return (
                <View key={item.key} className={styles.cell}>
                  <View
                    className={styles.actionTile}
                    onClick={() => setShowSavedPhrases(true)}
                  >
                    <Text className={styles.actionIcon}>⭐</Text>
                    <Text className={styles.actionLabel}>{item.label}</Text>
                  </View>
                </View>
              )
            })}
          </View>

          {items.length === 0 && (
            <EmptyState
              icon={isRecent ? '🕑' : '📭'}
              title={isRecent ? '暂无最近使用' : '暂无内容'}
            />
          )}
        </ScrollView>
      </View>
    </View>
  )
}

export default PictogramGrid
