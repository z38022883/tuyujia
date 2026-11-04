// ===== 首页（TabBar）：应用功能入口 —— 表达/接收/康复训练/中医辅助/收藏/历史六个卡片，
// 首次使用（无程度档案）自动跳转程度选择页；其后（无角色且未关闭过引导）跳转角色选择页。
// 角色 = 默认视角：功能卡片按角色排序 + 弱化（不隐藏），头部角色徽标可快捷切换。 =====
import { useMemo } from 'react';
import { View, Image, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import expressIcon from '@/assets/tabbar/express-selected.png';
import receiveIcon from '@/assets/tabbar/receive-selected.png';
import favoritesIcon from '@/assets/tabbar/favorites-selected.png';
import historyIcon from '@/assets/tabbar/history-selected.png';
import { useProfileStore } from '@/store/useProfileStore';
import { useUserStore } from '@/store/useUserStore';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { normalizeRole, roleLabel } from '@/utils/role-display';
import { shouldPromptRole } from '@/utils/role-gate';
import { REHAB_LEVEL_MAP } from '@/data/rehab';
import type { PatientProfile } from '@/types/profile';
import type { UserRole } from '@/types';
import styles from './index.module.scss';

interface HomeModule {
  key: string;
  title: string;
  desc: string;
  icon?: string;
  emoji?: string;
  url: string;
  iconClass: string;
  /** 角色弱化（降透明度仍可点入，desc 带另一方视角后缀） */
  weakened?: boolean;
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

/** 角色 → 首页模块编排（排序 + 弱化集合 + 弱化 desc 后缀）；MODULES 常量本身不动 */
const ROLE_HOME: Record<
  UserRole,
  { order: string[]; weakened: string[]; suffix: string }
> = {
  '': {
    // 未标注 = 向后兼容态：现状顺序不变，不弱化
    order: ['express', 'receive', 'rehab', 'tcm', 'favorites', 'history'],
    weakened: [],
    suffix: ''
  },
  patient: {
    order: ['express', 'rehab', 'tcm', 'favorites', 'history', 'receive'],
    weakened: ['receive'],
    suffix: '照护者工具'
  },
  family: {
    order: ['receive', 'rehab', 'favorites', 'history', 'express', 'tcm'],
    weakened: ['express', 'tcm'],
    suffix: '患者工具'
  }
};

function HomePage() {
  const severity = useProfileStore((s) => s.profile?.severity ?? null);
  const levelLabel = severity ? REHAB_LEVEL_MAP[severity].label : '';
  const role = useUserStore((s) => normalizeRole(s.user?.role));

  // 模块排序由 role 派生：改档回首页自动重排，无需重启
  const modules = useMemo(() => {
    const conf = ROLE_HOME[role] ?? ROLE_HOME[''];
    const weakenedSet = new Set(conf.weakened);
    return conf.order
      .map((key) => MODULES.find((m) => m.key === key))
      .filter((m): m is HomeModule => Boolean(m))
      .map((m) =>
        weakenedSet.has(m.key)
          ? { ...m, weakened: true, desc: `${m.desc}（${conf.suffix}）` }
          : { ...m, weakened: false }
      );
  }, [role]);

  // 首启门禁链：无患者程度档案 → 程度选择页；程度齐但未选角色且未「暂不选择」过 → 角色页
  // （新用户已在程度页保存时被直达角色页，这里主要兜底存量用户升级后的首次启动）
  useDidShow(() => {
    const profile = storage.get<PatientProfile | null>(
      STORAGE_KEYS.patientProfile,
      null
    );
    if (!profile) {
      Taro.reLaunch({ url: '/pages/level/index' });
      return;
    }
    if (shouldPromptRole()) {
      Taro.reLaunch({ url: '/pages/role/index?from=gate' });
    }
  });

  const handleEnter = (url: string) => {
    Taro.navigateTo({ url });
  };

  const handleChangeLevel = () => {
    Taro.navigateTo({ url: '/pages/level/index' });
  };

  const handleChangeRole = () => {
    Taro.navigateTo({ url: '/pages/role/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerRow}>
          <View>
            <View className={styles.title}>图语家</View>
            <View className={styles.subtitle}>选择功能，开始沟通</View>
          </View>
          <View className={styles.headerBadges}>
            {role && (
              <View
                className={classnames(
                  styles.roleBadge,
                  role === 'patient' ? styles.roleBadgePatient : styles.roleBadgeFamily
                )}
                onClick={handleChangeRole}
              >
                <Text className={styles.roleBadgeText}>{roleLabel(role)}</Text>
                <Text className={styles.roleBadgeArrow}>›</Text>
              </View>
            )}
            {severity && (
              <View className={styles.levelBadge} onClick={handleChangeLevel}>
                <Text className={styles.levelBadgeText}>程度 · {levelLabel}</Text>
                <Text className={styles.levelBadgeArrow}>›</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View className={styles.grid}>
        {modules.map((m) => (
          <View
            key={m.key}
            className={classnames(styles.card, m.weakened && styles.cardWeakened)}
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
