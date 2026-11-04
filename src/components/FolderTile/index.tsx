import { memo } from 'react';
import { View, Text, Image } from '@tarojs/components';
import type { Category } from '@/types';
import styles from './index.module.scss';

interface Props {
  category: Category;
  onClick?: (c: Category) => void;
}

// 纯展示图块，memo 避免父级词板因无关状态（如句条选择变化）整格重渲
function FolderTile({ category, onClick }: Props) {
  return (
    <View className={styles.folder} onClick={() => onClick?.(category)}>
      <Image
        className={styles.img}
        src={category.icon}
        mode="aspectFit"
        lazyLoad
      />
      <Text className={styles.label}>{category.name}</Text>
      <Text className={styles.badge}>📁</Text>
    </View>
  );
}

export default memo(FolderTile);
