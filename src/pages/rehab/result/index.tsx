import { useEffect, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import EmptyState from '@/components/EmptyState';
import { useRehabStore } from '@/store/useRehabStore';
import { REHAB_DIMENSION_LABELS, getRehabLevelMeta } from '@/data/rehab';
import type { RehabDimension } from '@/types/rehab';
import styles from './index.module.scss';

function ResultPage() {
  const { activeSession, loadLocalData, startSession } = useRehabStore();

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  const session = activeSession?.finishedAt ? activeSession : null;

  const dims = useMemo(() => {
    if (!session) return [];
    const map: Record<string, { total: number; correct: number }> = {};
    for (const r of session.taskRecords) {
      const d = map[r.dimension] ?? { total: 0, correct: 0 };
      d.total += 1;
      if (r.correct) d.correct += 1;
      map[r.dimension] = d;
    }
    return Object.entries(map) as [
      RehabDimension,
      { total: number; correct: number }
    ][];
  }, [session]);

  if (!session) {
    return (
      <View className={styles.wrap}>
        <EmptyState
          icon="📭"
          title="暂无训练结果"
          desc="完成一次训练后在这里查看结果"
        />
        <Button className={styles.btn} onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </View>
    );
  }

  const meta = getRehabLevelMeta(session.level);
  const correctCount = session.taskRecords.filter((r) => r.correct).length;
  const rate = session.totalTasks
    ? Math.round((correctCount / session.totalTasks) * 100)
    : 0;
  const minutes = Math.max(1, Math.round(session.durationSec / 60));

  const again = () => {
    startSession();
    Taro.redirectTo({ url: '/pages/rehab/training/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.badge}>🎉</View>
      <View className={styles.title}>本次训练完成</View>
      <View className={styles.subtitle}>
        {meta.label}训练 · {session.totalTasks} 题 · 用时 {minutes} 分钟
      </View>

      <View className={styles.rate}>{rate}%</View>
      <View className={styles.rateLabel}>完成率</View>

      {dims.length > 0 && (
        <View className={styles.dims}>
          {dims.map(([dim, v]) => (
            <View key={dim} className={styles.dimRow}>
              <Text className={styles.dimLabel}>
                {REHAB_DIMENSION_LABELS[dim]}
              </Text>
              <Text className={styles.dimValue}>
                {v.correct}/{v.total} 对
              </Text>
            </View>
          ))}
        </View>
      )}

      <View className={styles.actions}>
        <Button className={styles.btnPrimary} onClick={again}>
          再来一次
        </Button>
        <Button
          className={styles.btnGhost}
          onClick={() => Taro.switchTab({ url: '/pages/home/index' })}
        >
          返回首页
        </Button>
      </View>
    </View>
  );
}

export default ResultPage;
