import { View, Text, ScrollView, Button, Image } from '@tarojs/components';
import classnames from 'classnames';
import { useAppStore } from '@/store/useAppStore';
import styles from './index.module.scss';

function SelectionTray() {
  const selectedPictograms = useAppStore((s) => s.selectedPictograms);
  const removePictogram = useAppStore((s) => s.removePictogram);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const generateAndShowCandidates = useAppStore((s) => s.generateAndShowCandidates);
  const isGenerating = useAppStore((s) => s.isGenerating);

  const empty = selectedPictograms.length === 0;

  return (
    <View className={styles.bar}>
      <ScrollView scrollX className={styles.scroll} enhanced showScrollbar={false}>
        {empty ? (
          <View className={styles.placeholder}>
            <Text className={styles.placeholderText}>点选下方图符来组成句子</Text>
          </View>
        ) : (
          <View className={styles.chips}>
            {selectedPictograms.map((p, i) => (
              <View
                key={`${p.id}-${i}`}
                className={styles.chip}
                onClick={() => removePictogram(i)}
              >
                <Image
                  className={styles.chipImg}
                  src={p.imageUrl}
                  mode="aspectFit"
                  lazyLoad
                />
                <Text className={styles.chipText}>{p.labels.zh[0]}</Text>
                <Text className={styles.remove}>×</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View className={styles.actions}>
        <Button
          className={styles.btnClear}
          onClick={clearSelection}
          disabled={empty}
        >
          清空
        </Button>
        <Button
          className={classnames(styles.btnSpeak, isGenerating && styles.generating)}
          onClick={generateAndShowCandidates}
          disabled={empty || isGenerating}
        >
          {isGenerating ? '生成中' : '说'}
        </Button>
      </View>
    </View>
  );
}

export default SelectionTray;
