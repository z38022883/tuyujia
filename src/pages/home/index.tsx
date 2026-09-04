import { View, Image, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import expressIcon from '@/assets/tabbar/express-selected.png';
import receiveIcon from '@/assets/tabbar/receive-selected.png';
import favoritesIcon from '@/assets/tabbar/favorites-selected.png';
import historyIcon from '@/assets/tabbar/history-selected.png';
import { useProfileStore } from '@/store/useProfileStore';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { REHAB_LEVEL_MAP } from '@/data/rehab';
import type { PatientProfile } from '@/types/profile';
import styles from './index.module.scss';

interface HomeModule {
  key: string;
  title: string;
  desc: string;
  icon?: string;
  emoji?: string;
  url: string;
  iconClass: string;
}

const MODULES: HomeModule[] = [
  {
    key: 'express',
    title: '表达',
    desc: '点选图符，说出你想说的话',
    icon: expressIcon,
    url: '/pages/express/index',
    iconClass: styles.iconExpress
  },
  {
    key: 'receive',
    title: '接收',
    desc: '把话变成图片，展示给患者',
    icon: receiveIcon,
    url: '/pages/receive/index',
    iconClass: styles.iconReceive
  },
  {
    key: 'rehab',
    title: '康复训练',
    desc: '分级语言康复，每天进步一点',
    emoji: '🧩',
    url: '/pages/rehab/index',
    iconClass: styles.iconRehab
  },
  {
    key: 'tcm',
    title: '中医辅助训练',
    desc: '穴位按揉·音乐调息·嘴巴练习',
    emoji: '🌿',
    url: '/pages/tcm/index',
    iconClass: styles.iconTcm
  },
  {
    key: 'favorites',
    title: '收藏',
    desc: '查看和管理收藏的短语',
    icon: favoritesIcon,
    url: '/pages/favorites/index',
    iconClass: styles.iconFavorites
  },
  {
    key: 'history',
    title: '历史',
    desc: '按时间回顾表达记录',
    icon: historyIcon,
    url: '/pages/history/index',
    iconClass: styles.iconHistory
  }
];

function HomePage() {
  const severity = useProfileStore((s) => s.profile?.severity ?? null);
  const levelLabel = severity ? REHAB_LEVEL_MAP[severity].label : '';

  // 首启门禁：无患者程度档案 → 先去程度选择页（直接读 storage，避免依赖 store 加载时序）
  useDidShow(() => {
    const profile = storage.get<PatientProfile | null>(
      STORAGE_KEYS.patientProfile,
      null
    );
    if (!profile) {
      Taro.reLaunch({ url: '/pages/level/index' });
    }
  });

  const handleEnter = (url: string) => {
    Taro.navigateTo({ url });
  };

  const handleChangeLevel = () => {
    Taro.navigateTo({ url: '/pages/level/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerRow}>
          <View>
            <View className={styles.title}>图语家</View>
            <View className={styles.subtitle}>选择功能，开始沟通</View>
          </View>
          {severity && (
            <View className={styles.levelBadge} onClick={handleChangeLevel}>
              <Text className={styles.levelBadgeText}>程度 · {levelLabel}</Text>
              <Text className={styles.levelBadgeArrow}>›</Text>
            </View>
          )}
        </View>
      </View>
      <View className={styles.grid}>
        {MODULES.map((m) => (
          <View
            key={m.key}
            className={styles.card}
            hoverClass={styles.cardActive}
            onClick={() => handleEnter(m.url)}
          >
            <View className={`${styles.icon} ${m.iconClass}`}>
              {m.emoji ? (
                <Text className={styles.cardEmoji}>{m.emoji}</Text>
              ) : (
                <Image className={styles.iconImg} src={m.icon as string} mode="aspectFit" />
              )}
            </View>
            <View className={styles.cardTitle}>{m.title}</View>
            <View className={styles.cardDesc}>{m.desc}</View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default HomePage;
