import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { ReadingComprehensionPayload } from '@/types/rehab'
import { useSubmit } from './useSubmit'
import FeedbackFlash from './FeedbackFlash'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

/**
 * 阅读理解（客观题，自动判分）：读短文 → 选择题。
 * 选项点选后即时反馈：正确项标绿、错选项标红。
 */
export default function ReadingTask({ task, onDone }: TaskBodyProps) {
  const payload = task.payload as ReadingComprehensionPayload
  const { flash, locked, submit } = useSubmit(onDone)

  const [pickedIndex, setPickedIndex] = useState<number | null>(null)

  const handlePick = (i: number) => {
    if (locked) return
    setPickedIndex(i)
    submit(
      { correct: i === payload.answerIndex, answer: payload.options[i] },
      { delay: 1600 }
    )
  }

  return (
    <View className={styles.body}>
      <View className={styles.passageBox}>
        <Text className={styles.passageText}>{payload.passage}</Text>
      </View>

      <View className={styles.questionBox}>
        <Text className={styles.questionText}>{payload.question}</Text>
      </View>

      <View className={styles.optionCol}>
        {payload.options.map((opt, i) => (
          <View
            key={i}
            className={classnames(
              styles.optionBtn,
              locked && i === payload.answerIndex && styles.optionOk,
              locked && flash === 'wrong' && i === pickedIndex && styles.optionBad
            )}
            onClick={() => handlePick(i)}
          >
            <Text className={styles.optionText}>{opt}</Text>
          </View>
        ))}
      </View>

      <FeedbackFlash flash={flash} />
    </View>
  )
}
