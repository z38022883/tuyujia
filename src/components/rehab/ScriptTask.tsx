import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { ScriptDialoguePayload } from '@/types/rehab'
import { getPictogramsByIds } from '@/data'
import { useTaskSpeech } from './useTaskSpeech'
import { useSubmit } from './useSubmit'
import FeedbackFlash from './FeedbackFlash'
import PictoTile from './PictoTile'
import CaregiverHint from './CaregiverHint'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

/**
 * 生活脚本对话（陪护确认题）：照护者按脚本念 caregiver 句、患者回应 patient 句，
 * 逐轮推进；患者轮可展开提示图符。最后一轮由照护者总评完成情况。
 */
export default function ScriptTask({ task, onDone }: TaskBodyProps) {
  const payload = task.payload as ScriptDialoguePayload
  const turns = payload.turns
  const { flash, locked, submit } = useSubmit(onDone)

  const [turnIndex, setTurnIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const turn = turns[turnIndex]
  const isLast = turnIndex === turns.length - 1
  const isCaregiverTurn = turn.role === 'caregiver'
  const hints = getPictogramsByIds(turn.hintIds ?? [])

  // 照护者句自动朗读，示范语气与节奏
  const { play } = useTaskSpeech(isCaregiverTurn ? turn.line : '', true)

  const next = () => {
    setShowHint(false)
    setTurnIndex(turnIndex + 1)
  }

  const confirm = (done: boolean) => {
    if (locked) return
    submit({ correct: done, answer: done ? '完成对话' : '未完成' })
  }

  return (
    <View className={styles.body}>
      <View className={styles.scenarioBadge}>
        <Text className={styles.scenarioText}>场景：{payload.scenario}</Text>
      </View>

      {isCaregiverTurn && (
        <View
          className={classnames(styles.playBtn, styles.playBtnSm)}
          onClick={() => !locked && play()}
        >
          <Text className={styles.playIcon}>🔊</Text>
          <Text className={styles.playText}>再听一遍</Text>
        </View>
      )}

      <View
        className={classnames(
          styles.turnCard,
          isCaregiverTurn ? styles.turnCaregiver : styles.turnPatient
        )}
      >
        <Text className={styles.roleTag}>{isCaregiverTurn ? '照护者说' : '患者回应'}</Text>
        <Text className={styles.turnLine}>{turn.line}</Text>
      </View>

      {turns.length > 1 && (
        <Text className={styles.turnProgress}>
          第 {turnIndex + 1} / {turns.length} 轮
        </Text>
      )}

      {!isCaregiverTurn && hints.length > 0 && (
        <View className={styles.hintToggle} onClick={() => setShowHint(!showHint)}>
          <Text className={styles.hintToggleText}>
            {showHint ? '收起提示图片' : '说不出时，看提示图片'}
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

      <CaregiverHint
        text={
          isCaregiverTurn
            ? '照着上面的句子对患者说，说完点下一步'
            : '听患者回应，必要时展开提示图符'
        }
      />

      {!isLast ? (
        <View
          className={classnames(styles.btnPrimary, styles.btnBlock)}
          onClick={next}
        >
          <Text className={styles.btnPrimaryText}>下一步 ›</Text>
        </View>
      ) : (
        <View className={styles.btnRow}>
          <View
            className={classnames(styles.btnPrimary, locked && styles.btnDisabled)}
            onClick={() => confirm(true)}
          >
            <Text className={styles.btnPrimaryText}>顺利完成 ✓</Text>
          </View>
          <View
            className={classnames(styles.btnGhost, locked && styles.btnDisabled)}
            onClick={() => confirm(false)}
          >
            <Text className={styles.btnGhostText}>需要再练 ✗</Text>
          </View>
        </View>
      )}

      <FeedbackFlash flash={flash} />
    </View>
  )
}
