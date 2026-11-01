import { useMemo, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import classnames from 'classnames'
import type { CategorizePayload } from '@/types/rehab'
import { getPictogramsByIds } from '@/data'
import { useSubmit } from './useSubmit'
import FeedbackFlash from './FeedbackFlash'
import PictoTile from './PictoTile'
import { stableShuffle } from './stable-shuffle'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

/**
 * 词汇分类（客观题，点选交互，不做拖拽——适配患者操作能力）：
 * 先点类目桶激活 → 再点词块归入该桶；点桶内词块可退回。
 * 全部分类后提交，放错 0 个记为正确。
 */
export default function CategorizeTask({ task, onDone }: TaskBodyProps) {
  const payload = task.payload as CategorizePayload
  const { flash, locked, submit } = useSubmit(onDone)

  const items = useMemo(
    () => stableShuffle(getPictogramsByIds(payload.items.map((i) => i.id)), task.id),
    [task.id, payload.items]
  )
  const expected = useMemo(() => {
    const map: Record<string, string> = {}
    payload.items.forEach((i) => {
      map[i.id] = i.category
    })
    return map
  }, [payload.items])

  const [activeCat, setActiveCat] = useState<string | null>(null)
  /** picId -> 已归入的类目 key */
  const [assigned, setAssigned] = useState<Record<string, string>>({})

  const unassigned = items.filter((p) => !assigned[p.id])
  const allAssigned = unassigned.length === 0 && items.length > 0

  const handleItem = (id: string) => {
    if (locked || !activeCat) return
    setAssigned({ ...assigned, [id]: activeCat })
  }

  const handleBucketItem = (id: string) => {
    if (locked) return
    const next = { ...assigned }
    delete next[id]
    setAssigned(next)
  }

  const handleSubmit = () => {
    if (locked || !allAssigned) return
    const wrong = items.filter((p) => assigned[p.id] !== expected[p.id]).length
    submit(
      { correct: wrong === 0, answer: wrong === 0 ? '全部分类正确' : `放错 ${wrong} 个` },
      { delay: 1600 }
    )
  }

  return (
    <View className={styles.body}>
      <View className={styles.bucketRow}>
        {payload.categories.map((c) => {
          const inCat = items.filter((p) => assigned[p.id] === c.key)
          return (
            <View
              key={c.key}
              className={classnames(
                styles.bucket,
                activeCat === c.key && styles.bucketActive
              )}
              onClick={() => setActiveCat(c.key)}
            >
              <Text className={styles.bucketLabel}>{c.label}</Text>
              <View className={styles.bucketThumbs}>
                {inCat.map((p) => (
                  <View key={p.id} className={styles.bucketThumbWrap} onClick={(e) => { e.stopPropagation?.(); handleBucketItem(p.id) }}>
                    <Image className={styles.bucketThumb} src={p.imageUrl} mode="aspectFit" />
                  </View>
                ))}
              </View>
              <Text className={styles.bucketCount}>{inCat.length} 个</Text>
            </View>
          )
        })}
      </View>

      {!allAssigned ? (
        <View className={styles.tileGrid}>
          {unassigned.map((p) => (
            <PictoTile key={p.id} pictogram={p} onClick={() => handleItem(p.id)} />
          ))}
        </View>
      ) : (
        <View
          className={classnames(styles.btnPrimary, styles.btnBlock)}
          onClick={handleSubmit}
        >
          <Text className={styles.btnPrimaryText}>检查分类 ✓</Text>
        </View>
      )}

      {!activeCat && !allAssigned && (
        <Text className={styles.tipText}>先点上面的分类，再点下面的图片</Text>
      )}
      <FeedbackFlash flash={flash} />
    </View>
  )
}
