// ===== 康复训练主页：按程度档案等级开始训练；评估调级横幅、短板加权出题开关、训练/记录/家庭支持入口 =====
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useRehabStore } from '@/store/useRehabStore';
import { useProfileStore } from '@/store/useProfileStore';
import { REHAB_LEVELS, buildRehabTasks, getRehabLevelMeta } from '@/data/rehab';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { dimWeightsFromScores } from '@/utils/dim-weights';
import { streakDaysFromTimestamps } from '@/utils/streak-days';
import dayjs from 'dayjs';
import styles from './index.module.scss';

function RehabPage() {
  const { level, sessions, loadLocalData, setLevel, startSession } = useRehabStore();
  const profile = useProfileStore((s) => s.profile);
  const meta = getRehabLevelMeta(level);
  // 题库出题在本分包页面完成（store 不再依赖题库模块，题库 JSON 随分包加载）
  const taskCount = useMemo(() => buildRehabTasks(level).length, [level]);

  // 短板加权出题：有评估四维分时默认开启，可手动关闭
  const [weightOn, setWeightOn] = useState(() =>
    storage.get<boolean>(STORAGE_KEYS.rehabDimWeight, true)
  );
  const hasDimensions = !!profile?.dimensions;
  const weightActive = weightOn && hasDimensions;

  // 评估调级横幅：档案来自评估且尚未确认过（按档案 updatedAt 去重）
  const [showAssessBanner, setShowAssessBanner] = useState(false);

  const totalRecords = sessions.reduce((n, s) => n + s.taskRecords.length, 0);
  const correctRecords = sessions.reduce(
    (n, s) => n + s.taskRecords.filter((r) => r.correct).length,
    0
  );
  const avgRate = totalRecords ? Math.round((correctRecords / totalRecords) * 100) : 0;
  // 连续训练天数：按已完成会话的完成日期统计（含今天）
  const streakDays = streakDaysFromTimestamps(
    sessions.filter((s) => s.finishedAt).map((s) => s.finishedAt as number)
  );

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  // 每次页面显示时刷新档案（评估录入页返回后横幅/等级即时联动）
  useDidShow(() => {
    useProfileStore.getState().load();
    loadLocalData();
  });

  useEffect(() => {
    const appliedAt = storage.get<number>(STORAGE_KEYS.rehabAppliedProfileAt, 0);
    setShowAssessBanner(
      !!profile && profile.source === 'assess' && profile.updatedAt !== appliedAt
    );
  }, [profile]);

  // 训练等级与患者程度档案双向同步；评估确定时手动切档需确认覆盖
  const applyLevel = (key: typeof level) => {
    setLevel(key);
    useProfileStore.getState().setSeverity(key);
  };

  const handlePickLevel = (key: typeof level) => {
    if (key === level) return;
    if (profile?.source === 'assess') {
      Taro.showModal({
        title: '覆盖评估结果？',
        content: `当前「${meta.label}」档来自评估录入，手动修改将覆盖评估建议。`,
        confirmText: '确定修改',
        cancelText: '再想想',
        success: (res) => {
          if (res.confirm) applyLevel(key);
        }
      });
    } else {
      applyLevel(key);
    }
  };

  const handleStart = () => {
    startSession(
      buildRehabTasks(
        level,
        weightActive ? { dimensionWeights: dimWeightsFromScores(profile?.dimensions) } : undefined
      )
    );
    Taro.navigateTo({ url: '/pages/rehab/training/index' });
  };

  const toggleWeight = () => {
    const next = !weightActive;
    setWeightOn(next);
    storage.set(STORAGE_KEYS.rehabDimWeight, next);
  };

  const dismissBanner = () => {
    if (profile) storage.set(STORAGE_KEYS.rehabAppliedProfileAt, profile.updatedAt);
    setShowAssessBanner(false);
  };

  const go = (url: string) => Taro.navigateTo({ url });

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>康复训练</View>
          <View className={styles.subtitle}>按等级训练，每天进步一点</View>
        </View>

        {showAssessBanner && profile?.source === 'assess' && (
          <View className={styles.assessBanner}>
            <View className={styles.assessBannerMain}>
              <Text className={styles.assessBannerTitle}>
                已根据评估调至「{getRehabLevelMeta(profile.severity).label}」档
              </Text>
              <Text className={styles.assessBannerMeta}>
                {profile.aqScore !== undefined
                  ? `AQ ${profile.aqScore} · `
                  : ''}
                {profile.assessedAt ? dayjs(profile.assessedAt).format('MM-DD') : ''} 评估
                {hasDimensions ? ' · 出题已按短板加权' : ''}
              </Text>
            </View>
            <View className={styles.assessBannerBtn} onClick={dismissBanner}>
              知道了
            </View>
          </View>
        )}

        <View className={styles.section}>
          <View className={styles.sectionTitle}>训练等级</View>
          <View className={styles.card}>
            <View className={styles.levelDesc}>
              <Text className={styles.levelLabel}>{meta.label}失语</Text>
              <Text className={styles.levelAq}>{meta.aqRange}</Text>
              <View
                className={classnames(
                  styles.sourceTag,
                  profile?.source === 'assess' && styles.sourceTagAssess
                )}
              >
                {profile?.source === 'assess' ? '评估确定' : '手动设置'}
              </View>
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
                  onClick={() => handlePickLevel(m.key)}
                >
                  {m.label}
                </View>
              ))}
            </View>
            <Text className={styles.levelNote}>
              与「沟通程度」档案同步：修改会同步更新全局程度，可在 我的→患者程度 随时调整
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
                {hasDimensions && (
                  <View
                    className={classnames(
                      styles.weightChip,
                      weightActive && styles.weightChipOn
                    )}
                    onClick={toggleWeight}
                  >
                    <Text className={styles.weightChipText}>
                      {weightActive ? '✓ ' : ''}
                      按短板加权出题{weightActive ? '' : '（已关）'}
                    </Text>
                  </View>
                )}
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
              <Text className={styles.statValue}>{streakDays}</Text>
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
              onClick={() => go('/pages/assessment/entry/index')}
            >
              <Text className={styles.entryLabel}>评估录入</Text>
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
