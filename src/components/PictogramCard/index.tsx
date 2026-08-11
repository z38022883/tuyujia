import { View, Text, Image } from '@tarojs/components';
import type { PictogramEntry } from '@/types';
import styles from './index.module.scss';

interface Props {
  pictogram: PictogramEntry;
  color?: string;
  onClick?: (p: PictogramEntry) => void;
}

export default function PictogramCard({ pictogram, color, onClick }: Props) {
  return (
    <View
      className={styles.card}
      style={color ? { boxShadow: `inset 0 -6rpx 0 ${color}, 0 2rpx 12rpx rgba(0,0,0,0.06)` } : undefined}
      onClick={() => onClick?.(pictogram)}
    >
      <Image
        className={styles.img}
        src={pictogram.imageUrl}
        mode="aspectFit"
        lazyLoad
      />
      <Text className={styles.label}>{pictogram.labels.zh[0]}</Text>
    </View>
  );
}
