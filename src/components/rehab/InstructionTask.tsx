import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { InstructionCheckPayload } from '@/types/rehab'
import { getPictogramsByIds } from '@/data'
import { useTaskSpeech } from './useTaskSpeech'
import { useSubmit } from './useSubmit'
import FeedbackFlash from './FeedbackFlash'
import PictoTile from './PictoTile'
import CaregiverHint from './CaregiverHint'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

/**
 * 听指令执行（陪护确认题）：TTS 朗读 1~2 步指令，患者执行动作，
 * 照护者确认完成情况。提示图符按需展开（不提前剧透，保留听力考查）。
 */
export default function InstructionTask({ task, level, onDone }: TaskBodyProps) {
  const payload = task.payload as InstructionCheckPayload
  const { play } = useTaskSpeech(payload.steps.join('，'), true)
  const { flash, locked, submit } = useSubmit(onDone)

  const [showHint, setShowHint] = useState(false)
  const hints = getPictogramsByIds(payload.hintIds ?? [])

  const confirm = (done: boolean) => {
    if (locked) return
    submit({ correct: done, answer: done ? '完成' : '未完成' })
  }

  return (
    <View className={styles.body}>
      <View
        className={classnames(styles.playBtn, level === 'severe' && styles.playBtnLg)}
        onClick={() => !locked && play()}
      >
        <Text className={styles.playIcon}>🔊</Text>
        <Text className={styles.playText}>再听一遍指令</Text>
      </View>

      <View className={styles.stepList}>
        {payload.steps.map((s, i) => (
          <View key={i} className={styles.stepRow}>
            <Text className={styles.stepNo}>{i + 1}</Text>
            <Text className={styles.stepText}>{s}</Text>
          </View>
        ))}
      </View>

      {hints.length > 0 && (
        <View className={styles.hintToggle} onClick={() => setShowHint(!showHint)}>
          <Text className={styles.hintToggleText}>
            {showHint ? '收起提示图片' : '卡住了？看提示图片'}
          </Text>
        </View>
      )}
      {showHint && (
        <View className={styles.tileGrid}>
          {hints.map((p) => (
            <PictoTile key={p.id} pictogram={p} />
          ))}
        </View>
      )}

      <CaregiverHint text="观察患者是否按指令完成动作，再点下面的按钮" />

      <View className={styles.btnRow}>
        <View
          className={classnames(styles.btnPrimary, locked && styles.btnDisabled)}
          onClick={() => confirm(true)}
        >
          <Text className={styles.btnPrimaryText}>完成了 ✓</Text>
        </View>
        <View
          className={classnames(styles.btnGhost, locked && styles.btnDisabled)}
          onClick={() => confirm(false)}
        >
          <Text className={styles.btnGhostText}>没完成 ✗</Text>
        </View>
      </View>

      <FeedbackFlash flash={flash} />
    </View>
  )
}
