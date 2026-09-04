import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useProfileStore } from '@/store/useProfileStore'
import { useRehabStore } from '@/store/useRehabStore'
import type { PatientSeverity } from '@/types/profile'
import styles from './index.module.scss'

interface LevelOption {
  key: PatientSeverity
  title: string
  summary: string
  scope: string
}

const OPTIONS: LevelOption[] = [
  {
    key: 'mild',
    title: '轻度',
    summary: '能说短句，能听懂大部分日常对话',
    scope: '显示完整图库，保留完整表达流程'
  },
  {
    key: 'moderate',
    title: '中度',
    summary: '想说但常卡壳，能认出图片',
    scope: '显示 16 个常用词，可连点成句'
  },
  {
    key: 'severe',
    title: '重度',
    summary: '几乎无法开口表达',
    scope: '只显示 6 个最刚需词，点一下说出整句'
  }
]

function LevelPage() {
  const [selected, setSelected] = useState<PatientSeverity | null>(
    () => useProfileStore.getState().profile?.severity ?? null
  )

  const handleSave = () => {
    if (!selected) return
    useProfileStore.getState().setSeverity(selected)
    // 康复训练等级跟随档案（双向同步的一侧）
    useRehabStore.getState().setLevel(selected)
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/home/index' })
    }, 400)
  }

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>选择使用程度</View>
          <View className={styles.subtitle}>请照护者根据患者目前情况选择，可随时修改</View>
        </View>

        {OPTIONS.map((o) => {
          const active = selected === o.key
          return (
            <View
              key={o.key}
              className={classnames(styles.option, active && styles.optionActive)}
              onClick={() => setSelected(o.key)}
            >
              <View
                className={classnames(styles.dot, {
                  [styles.dotMild]: o.key === 'mild',
                  [styles.dotModerate]: o.key === 'moderate',
                  [styles.dotSevere]: o.key === 'severe'
                })}
              />
              <View className={styles.optionBody}>
                <View className={styles.optionTitle}>{o.title}</View>
                <View className={styles.optionSummary}>{o.summary}</View>
                <View className={styles.optionScope}>{o.scope}</View>
              </View>
              {active && <Text className={styles.check}>✓</Text>}
            </View>
          )
        })}

        <Text className={styles.note}>
          本选择仅用于界面适配，不代表正式医学评估；正式分级请遵医嘱。
        </Text>
      </ScrollView>

      <View className={styles.footer}>
        <View
          className={classnames(styles.btnSave, !selected && styles.btnDisabled)}
          onClick={handleSave}
        >
          确认
        </View>
      </View>
    </View>
  )
}

export default LevelPage
