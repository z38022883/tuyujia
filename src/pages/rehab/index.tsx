import { useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useRehabStore } from '@/store/useRehabStore';
import { REHAB_LEVELS, buildRehabTasks, getRehabLevelMeta } from '@/data/rehab';
import styles from './index.module.scss';

function RehabPage() {
  const { level, sessions, loadLocalData, setLevel, startSession } = useRehabStore();
  const meta = getRehabLevelMeta(level);
  const taskCount = buildRehabTasks(level).length;

  const totalRecords = sessions.reduce((n, s) => n + s.taskRecords.length, 0);
  const correctRecords = sessions.reduce(
    (n, s) => n + s.taskRecords.filter((r) => r.correct).length,
    0
  );
  const avgRate = totalRecords ? Math.round((correctRecords / totalRecords) * 100) : 0;

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  const handleStart = () => {
    startSession();
    Taro.navigateTo({ url: '/pages/rehab/training/index' });
  };

  const go = (url: string) => Taro.navigateTo({ url });

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>康复训练</View>
          <View className={styles.subtitle}>按等级训练，每天进步一点</View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>训练等级</View>
          <View className={styles.card}>
            <View className={styles.levelDesc}>
              <Text className={styles.levelLabel}>{meta.label}失语</Text>
              <Text className={styles.levelAq}>{meta.aqRange}</Text>
            </View>
            <Text className={styles.levelHint}>{meta.desc}</Text>
            <View className={styles.levelChips}>
              {REHAB_LEVELS.map((m) => (
                <View
                  key={m.key}
                  className={classnames(
                    styles.levelChip,
                    level === m.key && styles.levelChipActive
                  )}
                  onClick={() => setLevel(m.key)}
                >
                  {m.label}
                </View>
              ))}
            </View>
            <Text className={styles.levelNote}>
              当前为手动选择，分级评估上线后将自动匹配
            </Text>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>今日训练</View>
          <View className={styles.card}>
            {taskCount > 0 ? (
              <>
                <View className={styles.todayTitle}>{meta.label}训练计划</View>
                <Text className={styles.todayMeta}>
                  {taskCount} 个任务 · {meta.sessionHint}
                </Text>
              </>
            ) : (
              <>
                <View className={styles.todayTitle}>题库建设中</View>
                <Text className={styles.todayMeta}>
                  分级题库完善后将自动生成训练计划
                </Text>
              </>
            )}
            <View className={styles.btnPrimary} onClick={handleStart}>
              开始训练
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>我的数据</View>
          <View className={styles.statsRow}>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{sessions.length}</Text>
              <Text className={styles.statLabel}>完成训练</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>0</Text>
              <Text className={styles.statLabel}>连续天数</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{avgRate}%</Text>
              <Text className={styles.statLabel}>平均正确率</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>更多</View>
          <View className={styles.entryCard}>
            <View
              className={styles.entryRow}
              onClick={() => go('/pages/rehab/history/index')}
            >
              <Text className={styles.entryLabel}>训练记录</Text>
              <Text className={styles.entryArrow}>›</Text>
            </View>
            <View className={styles.divider} />
            <View
              className={styles.entryRow}
              onClick={() => go('/pages/rehab/family/index')}
            >
              <Text className={styles.entryLabel}>家庭沟通支持</Text>
              <Text className={styles.entryArrow}>›</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default RehabPage;
