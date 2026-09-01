import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useTcmStore, calcStreakDays } from '@/store/useTcmStore';
import { TCM_BADGES, getRandomWarmTip } from '@/data/tcm';
import styles from './index.module.scss';

const PRACTICES = [
  {
    key: 'acupoint',
    emoji: '✋',
    title: '穴位按揉',
    desc: '按一按，嘴巴说话更轻松',
    url: '/pages/tcm/acupoint/index'
  },
  {
    key: 'relax',
    emoji: '🍃',
    title: '音乐调息',
    desc: '跟着呼吸放松，缓解紧张情绪',
    url: '/pages/tcm/music/index'
  },
  {
    key: 'mouth',
    emoji: '😁',
    title: '嘴巴小练习',
    desc: '舌头和嘴巴做做操，基础发音练习',
    url: '/pages/tcm/mouth/index'
  }
];

function TcmPage() {
  const { checkIns, badges, loadLocalData } = useTcmStore();
  const [tip] = useState(() => getRandomWarmTip());

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  const streak = useMemo(() => calcStreakDays(checkIns), [checkIns]);
  const ownedBadges = TCM_BADGES.filter((b) => badges.includes(b.key));

  const go = (url: string) => Taro.navigateTo({ url });

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>中医辅助训练</View>
          <View className={styles.subtitle}>辅助放松，居家保健，每天轻松练一练</View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>训练项目</View>
          {PRACTICES.map((p) => (
            <View
              key={p.key}
              className={styles.practiceCard}
              hoverClass={styles.practiceCardActive}
              onClick={() => go(p.url)}
            >
              <View className={styles.practiceIcon}>
                <Text className={styles.practiceEmoji}>{p.emoji}</Text>
              </View>
              <View className={styles.practiceInfo}>
                <View className={styles.practiceTitle}>{p.title}</View>
                <View className={styles.practiceDesc}>{p.desc}</View>
              </View>
              <Text className={styles.practiceArrow}>›</Text>
            </View>
          ))}
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>我的数据</View>
          <View className={styles.statsRow}>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{checkIns.length}</Text>
              <Text className={styles.statLabel}>累计打卡</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{streak}</Text>
              <Text className={styles.statLabel}>连续天数</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>{ownedBadges.length}</Text>
              <Text className={styles.statLabel}>获得勋章</Text>
            </View>
          </View>
        </View>

        {ownedBadges.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionTitle}>我的勋章</View>
            <View className={styles.badgeRow}>
              {TCM_BADGES.map((b) => {
                const owned = badges.includes(b.key);
                return (
                  <View
                    key={b.key}
                    className={`${styles.badgeItem} ${owned ? '' : styles.badgeLocked}`}
                  >
                    <Text className={styles.badgeEmoji}>{owned ? b.emoji : '🔒'}</Text>
                    <Text className={styles.badgeName}>{b.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View className={styles.tipCard}>
          <Text className={styles.tipQuote}>“</Text>
          <Text className={styles.tipText}>{tip}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default TcmPage;
