import { View, Text, Image } from '@tarojs/components'
import classnames from 'classnames'
import type { PictogramEntry } from '@/types'
import styles from './shared.module.scss'

interface Props {
  pictogram: PictogramEntry
  selected?: boolean
  state?: 'correct' | 'wrong' | null
  size?: 'md' | 'lg'
  onClick?: () => void
}

/** 图符选项卡（指认/配对/分类等题型复用） */
export default function PictoTile({ pictogram, selected, state, size = 'md', onClick }: Props) {
  return (
    <View
      className={classnames(
        styles.tile,
        size === 'lg' && styles.tileLg,
        selected && styles.tileSelected,
        state === 'correct' && styles.tileOk,
        state === 'wrong' && styles.tileBad
      )}
      onClick={onClick}
    >
      <Image className={styles.tileImg} src={pictogram.imageUrl} mode="aspectFit" />
      <Text className={styles.tileLabel}>{pictogram.labels.zh[0]}</Text>
    </View>
  )
}
