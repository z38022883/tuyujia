import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface Props {
  canGoBack: boolean
  onGoRoot: () => void
  onGoBack: () => void
}

/**
 * 左侧层级导航栏（对应原版 PictogramGrid 中的 HierarchyNavRail）。
 * 提供「首页」「返回」两个大按钮，仅在非 root 分类时显示。
 */
function HierarchyNavRail({ canGoBack, onGoRoot, onGoBack }: Props) {
  return (
    <View className={styles.rail}>
      <View className={styles.btn} onClick={onGoRoot}>
        <Text className={styles.icon}>🏠</Text>
        <Text className={styles.label}>首页</Text>
      </View>
      <View
        className={styles.btn}
        onClick={canGoBack ? onGoBack : onGoRoot}
      >
        <Text className={styles.icon}>←</Text>
        <Text className={styles.label}>返回</Text>
      </View>
    </View>
  )
}

export default HierarchyNavRail
