import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { PickFromPictogramsPayload } from '@/types/rehab'
import { getPictogramsByIds } from '@/data'
import { useTaskSpeech } from './useTaskSpeech'
import { useSubmit } from './useSubmit'
import FeedbackFlash from './FeedbackFlash'
import PictoTile from './PictoTile'
import { stableShuffle } from './stable-shuffle'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

/**
 * 听词指认 / 看字选图（客观题，自动判分）：
 * - listen：TTS 读目标词，患者从 4 图中选出（听理解）
 * - read：大字显示目标词，患者选图（阅读）
 * 选项顺序按任务 id 稳定打乱（重进同题不换位）。
 */
export default function PickTask({ task, level, onDone }: TaskBodyProps) {
  const payload = task.payload as PickFromPictogramsPayload
  const isListen = (payload.variant ?? 'listen') === 'listen'
  const { play } = useTaskSpeech(isListen ? `请找出，${payload.word}` : '', true)
  const { flash, locked, submit } = useSubmit(onDone)

  const options = useMemo(
    () => stableShuffle(getPictogramsByIds(payload.optionIds), task.id),
    [task.id, payload.optionIds]
  )

  const [pickedId, setPickedId] = useState<string | null>(null)

  const handlePick = (id: string) => {
    if (locked) return
    setPickedId(id)
    const label = getPictogramsByIds([id])[0]?.labels.zh[0] ?? id
    submit({ correct: id === payload.answerId, answer: label }, { delay: 1600 })
  }

  return (
    <View className={styles.body}>
      {isListen ? (
        <View className={classnames(styles.playBtn, level === 'severe' && styles.playBtnLg)} onClick={() => !locked && play()}>
          <Text className={styles.playIcon}>🔊</Text>
          <Text className={styles.playText}>再听一遍</Text>
        </View>
      ) : (
        <View className={classnames(styles.bigWord, level === 'severe' && styles.bigWordLg)}>
          <Text>{payload.word}</Text>
        </View>
      )}

      <View className={styles.tileGrid}>
        {options.map((p) => (
          <PictoTile
            key={p.id}
            pictogram={p}
            size="lg"
            state={
              locked && flash
                ? p.id === payload.answerId
                  ? 'correct'
                  : p.id === pickedId
                    ? 'wrong'
                    : null
                : null
            }
            selected={!locked && p.id === pickedId}
            onClick={() => handlePick(p.id)}
          />
        ))}
      </View>

      <FeedbackFlash flash={flash} />
    </View>
  )
}
