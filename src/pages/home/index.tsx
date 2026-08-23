import { View, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import expressIcon from '@/assets/tabbar/express-selected.png';
import receiveIcon from '@/assets/tabbar/receive-selected.png';
import favoritesIcon from '@/assets/tabbar/favorites-selected.png';
import historyIcon from '@/assets/tabbar/history-selected.png';
import styles from './index.module.scss';

interface HomeModule {
  key: string;
  title: string;
  desc: string;
  icon: string;
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
  const handleEnter = (url: string) => {
    Taro.navigateTo({ url });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.title}>图语家</View>
        <View className={styles.subtitle}>选择功能，开始沟通</View>
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
              <Image className={styles.iconImg} src={m.icon} mode="aspectFit" />
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
