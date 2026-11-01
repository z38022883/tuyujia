import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { MatchPairPayload } from '@/types/rehab'
import { getPictogramsByIds } from '@/data'
import { useSubmit } from './useSubmit'
import FeedbackFlash from './FeedbackFlash'
import PictoTile from './PictoTile'
import { stableShuffle } from './stable-shuffle'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

/**
 * 图文配对（客观题）：点词卡选中 → 点图卡配对。
 * 配对成功双方锁定为绿色；全部配对完成时提交，错误次数 ≤2 记为正确。
 */
export default function MatchPairTask({ task, onDone }: TaskBodyProps) {
  const payload = task.payload as MatchPairPayload
  const { flash, locked, submit } = useSubmit(onDone)

  const pairs = payload.pairs
  const pics = useMemo(
    () => stableShuffle(getPictogramsByIds(pairs.map((p) => p.pictogramId)), task.id),
    [task.id, pairs]
  )

  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<string[]>([])
  const [wrongCount, setWrongCount] = useState(0)
  const [wrongPicId, setWrongPicId] = useState<string | null>(null)

  const matchedText = (picId: string): string | null => {
    const p = pairs.find((x) => x.pictogramId === picId)
    return p && matchedIds.includes(picId) ? p.text : null
  }

  const handleWord = (text: string) => {
    if (locked || matchedText(pairs.find((p) => p.text === text)!.pictogramId)) return
    setSelectedText(selectedText === text ? null : text)
  }

  const handlePic = (picId: string) => {
    if (locked || matchedIds.includes(picId)) return
    if (!selectedText) return
    const pair = pairs.find((p) => p.pictogramId === picId)
    if (pair?.text === selectedText) {
      const next = [...matchedIds, picId]
      setMatchedIds(next)
      setSelectedText(null)
      if (next.length === pairs.length) {
        submit(
          { correct: wrongCount <= 2, answer: `错 ${wrongCount} 次` },
          { delay: 1500 }
        )
      }
    } else {
      setWrongCount(wrongCount + 1)
      setWrongPicId(picId)
      setTimeout(() => setWrongPicId(null), 600)
    }
  }

  return (
    <View className={styles.body}>
      <View className={styles.matchRow}>
        <View className={styles.matchCol}>
          {pairs.map((p) => {
            const matched = matchedIds.includes(p.pictogramId)
            return (
              <View
                key={p.text}
                className={classnames(
                  styles.wordCard,
                  selectedText === p.text && styles.wordCardSelected,
                  matched && styles.wordCardMatched
                )}
                onClick={() => handleWord(p.text)}
              >
                <Text className={styles.wordCardText}>{matched ? '✓ ' : ''}{p.text}</Text>
              </View>
            )
          })}
        </View>
        <View className={styles.matchCol}>
          {pics.map((p) => (
            <PictoTile
              key={p.id}
              pictogram={p}
              state={
                matchedIds.includes(p.id)
                  ? 'correct'
                  : p.id === wrongPicId
                    ? 'wrong'
                    : null
              }
              onClick={() => handlePic(p.id)}
            />
          ))}
        </View>
      </View>

      {!selectedText && matchedIds.length < pairs.length && (
        <Text className={styles.tipText}>先点一个词语，再点对应的图片</Text>
      )}
      <FeedbackFlash flash={flash} />
    </View>
  )
}
