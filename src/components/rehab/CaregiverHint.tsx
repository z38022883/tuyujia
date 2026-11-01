import { View, Text } from '@tarojs/components'
import styles from './shared.module.scss'

/** 照护者指引小字条（陪护参与环节的操作说明） */
export default function CaregiverHint({ text }: { text: string }) {
  return (
    <View className={styles.caregiver}>
      <Text className={styles.caregiverTag}>照护者</Text>
      <Text className={styles.caregiverText}>{text}</Text>
    </View>
  )
}
