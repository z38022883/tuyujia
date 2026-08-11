import { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useAppStore } from '@/store/useAppStore'
import {
  resolveGridItems,
  getRecentPictograms,
  getCategory,
  type GridItem
} from '@/data'
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

/**
 * 主网格组件（对应原版 src/components/PictogramGrid/PictogramGrid.tsx）。
 *
 * 负责：
 * - 顶部标题栏（当前分类名）
 * - 非根分类时左侧 HierarchyNavRail（首页/返回）
 * - 网格渲染：图符 / 分类文件夹 / 常用入口
 * - 空状态
 */
function PictogramGrid() {
  const activeCategoryId = useAppStore((s) => s.activeCategoryId)
  const categoryPath = useAppStore((s) => s.categoryPath)
  const openCategory = useAppStore((s) => s.openCategory)
  const goBackCategory = useAppStore((s) => s.goBackCategory)
  const goRootCategory = useAppStore((s) => s.goRootCategory)
  const addPictogram = useAppStore((s) => s.addPictogram)
  const setShowSavedPhrases = useAppStore((s) => s.setShowSavedPhrases)

  const isRoot = activeCategoryId === 'root'
  const isRecent = activeCategoryId === 'recent'
  const targetId = isRoot ? 'home' : activeCategoryId
  const activeCategory = getCategory(targetId)

  const items = useMemo<GridItem[]>(() => {
    if (isRecent) {
      return getRecentPictograms(24).map((p) => ({
        type: 'pictogram' as const,
        key: `p:${p.id}`,
        pictogram: p
      }))
    }
    return resolveGridItems(activeCategoryId)
  }, [activeCategoryId, isRecent])

  const color = isRoot ? ROOT_COLOR : (CATEGORY_COLORS[activeCategoryId] ?? '#4A90D9')
  const title = isRoot
    ? '首页'
    : isRecent
      ? '最近'
      : (activeCategory?.name ?? '未找到')
  const canGoBack = categoryPath.length > 0

  function handleSelect(p: PictogramEntry) {
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
                  <View key={item.key} className={styles.cell}>
                    <PictogramCard
                      pictogram={item.pictogram}
                      color={color}
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
