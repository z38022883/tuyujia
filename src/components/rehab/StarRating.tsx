import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './shared.module.scss'

interface Props {
  value?: number
  onChange?: (n: number) => void
  size?: 'md' | 'lg'
}

/** 1-5 星评分（患者自评 / 照护者评） */
export default function StarRating({ value = 0, onChange, size = 'md' }: Props) {
  return (
    <View className={classnames(styles.starRow, size === 'lg' && styles.starRowLg)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          className={classnames(
            styles.star,
            n <= value && styles.starActive,
            !onChange && styles.starReadonly
          )}
          onClick={() => onChange?.(n)}
        >
          <Text>{n <= value ? '★' : '☆'}</Text>
        </View>
      ))}
    </View>
  )
}
