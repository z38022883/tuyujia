// ===== 康复训练记录页：历史训练会话列表（时间、等级、时长、完成度）=====
import { useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import dayjs from 'dayjs';
import EmptyState from '@/components/EmptyState';
import { useRehabStore } from '@/store/useRehabStore';
import { getRehabLevelMeta } from '@/data/rehab';
import styles from './index.module.scss';

function HistoryPage() {
  const { sessions, loadLocalData } = useRehabStore();

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  if (sessions.length === 0) {
    return (
      <View className={styles.wrap}>
        <EmptyState
          icon="🗓️"
          title="还没有训练记录"
          desc="完成一次训练后，记录会出现在这里"
        />
      </View>
    );
  }

  // 最近 10 次正确率趋势（旧→新，纯 View 条形图）
  const trend = sessions
    .filter((s) => s.taskRecords.length > 0)
    .slice(0, 10)
    .reverse()
    .map((s) => {
      const correct = s.taskRecords.filter((r) => r.correct).length;
      return {
        id: s.id,
        rate: Math.round((correct / s.taskRecords.length) * 100),
        date: dayjs(s.startedAt).format('MM-DD')
      };
    });

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        {trend.length >= 2 && (
          <View className={styles.trendCard}>
            <View className={styles.trendTitle}>正确率趋势（最近 {trend.length} 次）</View>
            <View className={styles.trendChart}>
              {trend.map((t) => (
                <View key={t.id} className={styles.trendCol}>
                  <Text className={styles.trendRate}>{t.rate}%</Text>
                  <View className={styles.trendBarTrack}>
                    <View
                      className={styles.trendBar}
                      style={{ height: `${Math.max(4, t.rate)}%` }}
                    />
                  </View>
                  <Text className={styles.trendDate}>{t.date}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {sessions.map((s) => {
          const meta = getRehabLevelMeta(s.level);
          const correct = s.taskRecords.filter((r) => r.correct).length;
          const minutes = Math.max(1, Math.round(s.durationSec / 60));
          return (
            <View key={s.id} className={styles.card}>
              <View className={styles.cardTop}>
                <Text className={styles.levelTag}>{meta.label}</Text>
                <Text className={styles.time}>
                  {dayjs(s.startedAt).format('MM-DD HH:mm')}
                </Text>
              </View>
              <View className={styles.cardBottom}>
                <Text className={styles.metric}>
                  {s.completedTasks}/{s.totalTasks} 题
                </Text>
                <Text className={styles.metric}>答对 {correct}</Text>
                <Text className={styles.metric}>{minutes} 分钟</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default HistoryPage;
