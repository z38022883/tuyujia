import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { FlashState } from './useSubmit'
import styles from './shared.module.scss'

/** 即时对/错反馈条（语音鼓励由 useSubmit 统一处理） */
export default function FeedbackFlash({ flash }: { flash: FlashState }) {
  if (!flash) return null
  const ok = flash === 'correct'
  return (
    <View className={classnames(styles.flash, ok ? styles.flashOk : styles.flashBad)}>
      <Text className={styles.flashText}>{ok ? '✓ 答对了' : '✗ 再想想'}</Text>
    </View>
  )
}
