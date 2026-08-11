import { View, Text } from '@tarojs/components';
import { useAppStore } from '@/store/useAppStore';
import styles from './index.module.scss';

function PlaybackOverlay() {
  const showPlayback = useAppStore((s) => s.showPlayback);
  const playbackSentence = useAppStore((s) => s.playbackSentence);
  const stopPlayback = useAppStore((s) => s.stopPlayback);

  if (!showPlayback) return null;

  return (
    <View className={styles.overlay} onClick={stopPlayback}>
      <View className={styles.content}>
        <Text className={styles.anim}>🔊</Text>
        <Text className={styles.sentence}>{playbackSentence}</Text>
        <Text className={styles.hint}>点击关闭</Text>
      </View>
    </View>
  );
}

export default PlaybackOverlay;
