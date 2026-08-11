import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface Props {
  icon?: string;
  title: string;
  desc?: string;
}

export default function EmptyState({ icon = '📭', title, desc }: Props) {
  return (
    <View className={styles.wrap}>
      <Text className={styles.icon}>{icon}</Text>
      <Text className={styles.title}>{title}</Text>
      {desc ? <Text className={styles.desc}>{desc}</Text> : null}
    </View>
  );
}
