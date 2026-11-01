import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type {
  DescribePicturePayload,
  FollowReadPayload,
  IdiomReadPayload,
  ListenRecallPayload,
  MelodyHumPayload
} from '@/types/rehab'
import { getPictogramsByIds } from '@/data'
import { useTaskSpeech } from './useTaskSpeech'
import { useSubmit } from './useSubmit'
import StarRating from './StarRating'
import PictoTile from './PictoTile'
import CaregiverHint from './CaregiverHint'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

/**
 * 星级评价题（泛型骨架，5 种题型复用）：范读/展示 → 患者作答 → 星级评价。
 * - follow-read 跟读复述：大字短句 + 范读
 * - idiom-read 成语朗读：成语 + 释义 + 范读
 * - melody-hum 旋律哼唱：歌名 + 歌词 + 歌词朗读
 * - listen-recall 听短文复述：只播短文不显示原文（听力考查），照护者按要点评星
 * - describe-picture 看图描述：场景图符，照护者按要点评星
 * correct = rating >= 3（仅统计用），提交静默（不对患者弹出对/错）。
 */
export default function StarRatedTask({ task, level, onDone }: TaskBodyProps) {
  const payload = task.payload
  const { locked, submit } = useSubmit(onDone)

  // 各题型的朗读文本与内容展示
  let speechText = ''
  let content: JSX.Element | null = null
  let hint = '听完患者作答后，按表现点亮星星'

  if (payload.taskType === 'follow-read') {
    const p = payload as FollowReadPayload
    speechText = p.sentence
    const pictos = getPictogramsByIds(p.pictogramIds ?? [])
    content = (
      <View className={styles.centerCol}>
        <View className={classnames(styles.bigSentence, level === 'severe' && styles.bigSentenceLg)}>
          <Text>{p.sentence}</Text>
        </View>
        {pictos.length > 0 && (
          <View className={styles.tileRow}>
            {pictos.map((x) => (
              <PictoTile key={x.id} pictogram={x} />
            ))}
          </View>
        )}
      </View>
    )
    hint = '患者跟读一遍后，按清晰程度点亮星星'
  } else if (payload.taskType === 'idiom-read') {
    const p = payload as IdiomReadPayload
    speechText = p.idiom
    content = (
      <View className={styles.centerCol}>
        <View className={styles.bigSentence}>
          <Text>{p.idiom}</Text>
        </View>
        <Text className={styles.meaningText}>{p.meaning}</Text>
      </View>
    )
    hint = '患者朗读成语后，按流畅程度点亮星星'
  } else if (payload.taskType === 'melody-hum') {
    const p = payload as MelodyHumPayload
    speechText = p.lyrics.replace(/\n/g, '，')
    content = (
      <View className={styles.centerCol}>
        <Text className={styles.songTitle}>🎵 {p.song}</Text>
        {p.lyrics.split('\n').map((line, i) => (
          <Text key={i} className={styles.lyricsLine}>
            {line}
          </Text>
        ))}
      </View>
    )
    hint = '患者跟着旋律哼唱后，按完整程度点亮星星'
  } else if (payload.taskType === 'listen-recall') {
    const p = payload as ListenRecallPayload
    speechText = p.passage
    content = (
      <View className={styles.centerCol}>
        <Text className={styles.tipText}>短文只播放不显示，听完后试着复述</Text>
        <View className={styles.keyPoints}>
          <Text className={styles.keyPointsTitle}>复述要点（照护者对照）</Text>
          {p.keyPoints.map((k, i) => (
            <Text key={i} className={styles.keyPointItem}>
              {i + 1}. {k}
            </Text>
          ))}
        </View>
      </View>
    )
    hint = '患者复述后，按要点覆盖程度点亮星星'
  } else if (payload.taskType === 'describe-picture') {
    const p = payload as DescribePicturePayload
    const scenes = getPictogramsByIds(p.scenePictogramIds)
    content = (
      <View className={styles.centerCol}>
        <View className={styles.tileRow}>
          {scenes.map((x) => (
            <PictoTile key={x.id} pictogram={x} size="lg" />
          ))}
        </View>
        <View className={styles.keyPoints}>
          <Text className={styles.keyPointsTitle}>描述要点（照护者对照）</Text>
          {p.keyPoints.map((k, i) => (
            <Text key={i} className={styles.keyPointItem}>
              {i + 1}. {k}
            </Text>
          ))}
        </View>
      </View>
    )
    hint = '患者看图描述后，按要点覆盖程度点亮星星'
  }

  const { play } = useTaskSpeech(speechText, true)

  const handleRate = (n: number) => {
    if (locked) return
    submit(
      { correct: n >= 3, rating: n, answer: `${n} 星` },
      { quiet: true, delay: 400 }
    )
  }

  return (
    <View className={styles.body}>
      {speechText && (
        <View
          className={classnames(styles.playBtn, level === 'severe' && styles.playBtnLg)}
          onClick={() => !locked && play()}
        >
          <Text className={styles.playIcon}>🔊</Text>
          <Text className={styles.playText}>再听一遍</Text>
        </View>
      )}

      {content}

      <CaregiverHint text={hint} />
      <StarRating onChange={handleRate} size={level === 'severe' ? 'lg' : 'md'} />
    </View>
  )
}
