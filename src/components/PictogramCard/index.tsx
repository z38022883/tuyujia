import { View, Text, Image } from '@tarojs/components';
import classnames from 'classnames';
import type { PictogramEntry } from '@/types';
import styles from './index.module.scss';

export type PictogramCardSize = 'default' | 'lg' | 'xl';

interface Props {
  pictogram: PictogramEntry;
  color?: string;
  onClick?: (p: PictogramEntry) => void;
  /** 尺寸档位：default=常规 / lg=中度词板 / xl=重度超大词板 */
  size?: PictogramCardSize;
}

export default function PictogramCard({ pictogram, color, onClick, size = 'default' }: Props) {
  return (
    <View
      className={classnames(styles.card, {
        [styles.cardLg]: size === 'lg',
        [styles.cardXl]: size === 'xl'
      })}
      style={color ? { boxShadow: `inset 0 -6rpx 0 ${color}, 0 2rpx 12rpx rgba(0,0,0,0.06)` } : undefined}
      onClick={() => onClick?.(pictogram)}
    >
      <Image
        className={classnames(styles.img, {
          [styles.imgLg]: size === 'lg',
          [styles.imgXl]: size === 'xl'
        })}
        src={pictogram.imageUrl}
        mode="aspectFit"
        lazyLoad
      />
      <Text
        className={classnames(styles.label, {
          [styles.labelLg]: size === 'lg',
          [styles.labelXl]: size === 'xl'
        })}
      >
        {pictogram.labels.zh[0]}
      </Text>
    </View>
  );
}
