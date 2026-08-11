import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

function OnboardingPage() {
  return (
    <View className={styles.page}>
      <Text className={styles.icon}>👋</Text>
      <Text className={styles.title}>使用引导</Text>
      <Text className={styles.desc}>功能正在开发中...</Text>
    </View>
  );
}

export default OnboardingPage;
