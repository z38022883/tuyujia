import { View, Text, Button, ScrollView } from '@tarojs/components';
import { useAppStore } from '@/store/useAppStore';
import styles from './index.module.scss';

function CandidatePanel() {
  const showCandidatePanel = useAppStore((s) => s.showCandidatePanel);
  const candidateSentences = useAppStore((s) => s.candidateSentences);
  const pickCandidate = useAppStore((s) => s.pickCandidate);
  const setShowCandidatePanel = useAppStore((s) => s.setShowCandidatePanel);

  if (!showCandidatePanel) return null;

  return (
    <View className={styles.overlay} onClick={() => setShowCandidatePanel(false)}>
      <View
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <View className={styles.header}>
          <Text className={styles.title}>选择要说的句子</Text>
          <Text className={styles.close} onClick={() => setShowCandidatePanel(false)}>
            ×
          </Text>
        </View>
        <ScrollView scrollY className={styles.list}>
          {candidateSentences.length === 0 ? (
            <View className={styles.empty}>没有生成候选句</View>
          ) : (
            candidateSentences.map((s, i) => (
              <Button
                key={i}
                className={styles.item}
                onClick={() => pickCandidate(s)}
              >
                {s}
              </Button>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export default CandidatePanel;
