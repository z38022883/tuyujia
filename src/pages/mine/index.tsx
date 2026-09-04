import { useEffect, useState } from 'react';
import { View, Text, Button, Slider, Switch, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAppStore } from '@/store/useAppStore';
import { useProfileStore } from '@/store/useProfileStore';
import { callFunction } from '@/services/cloud';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { speak } from '@/services/tts';
import { REHAB_LEVEL_MAP } from '@/data/rehab';
import type { User } from '@/types';
import styles from './index.module.scss';

const VOICES = [
  { id: 'female', name: '女声' },
  { id: 'male', name: '男声' }
];

function MinePage() {
  const { settings, updateSettings } = useAppStore();
  const severity = useProfileStore((s) => s.profile?.severity ?? null);
  const [user, setUser] = useState<User | null>(null);
  const [rate, setRate] = useState(settings.rate);

  useEffect(() => {
    setRate(settings.rate);
  }, [settings.rate]);

  useEffect(() => {
    const cached = storage.get<User | null>(STORAGE_KEYS.user, null);
    if (cached) setUser(cached);
    callFunction<{ openid: string; user: User }>('login')
      .then((res) => {
        if (!res) return; // H5 预览模式跳过
        setUser(res.user);
        storage.set(STORAGE_KEYS.user, res.user);
      })
      .catch((err) => console.error('[Mine] login:', err));
  }, []);

  const handleTestSpeak = () => {
    speak('你好，这是图语家的语音测试', settings).catch((err) =>
      console.error('[Mine] test speak:', err)
    );
  };

  const goLevel = () => {
    Taro.navigateTo({ url: '/pages/level/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.title}>我的</View>
      </View>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.userCard}>
          <View className={styles.avatar}>{user?.avatar ? null : '👤'}</View>
          <View className={styles.userInfo}>
            <View className={styles.nickname}>{user?.nickname || '点击登录'}</View>
            <View className={styles.uid}>
              {user?.openid ? `ID: ${user.openid.slice(0, 10)}` : '未登录'}
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>患者程度</View>
          <View className={styles.card}>
            <View className={styles.row} onClick={goLevel}>
              <Text className={styles.label}>沟通程度</Text>
              <View className={styles.valueWrap}>
                {severity ? (
                  <View className={styles.sevTag}>
                    <Text>{REHAB_LEVEL_MAP[severity].label}</Text>
                  </View>
                ) : (
                  <Text className={styles.value}>未设置</Text>
                )}
                <Text className={styles.arrow}>›</Text>
              </View>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>语音设置</View>
          <View className={styles.card}>
            <View className={styles.row}>
              <Text className={styles.label}>语速</Text>
              <Text className={styles.value}>{rate.toFixed(1)}x</Text>
            </View>
            <Slider
              className={styles.slider}
              min={0.5}
              max={2}
              step={0.1}
              value={rate}
              onChanging={(e) => setRate(e.detail.value)}
              onChange={(e) => updateSettings({ rate: e.detail.value })}
              activeColor="#2bb6c4"
              blockSize={20}
            />
            <View className={styles.row}>
              <Text className={styles.label}>音色</Text>
              <View className={styles.voiceGroup}>
                {VOICES.map((v) => (
                  <View
                    key={v.id}
                    className={classnames(
                      styles.voiceChip,
                      settings.voiceName === v.id && styles.voiceActive
                    )}
                    onClick={() => updateSettings({ voiceName: v.id })}
                  >
                    {v.name}
                  </View>
                ))}
              </View>
            </View>
            <View className={styles.divider} />
            <View className={styles.row}>
              <Text className={styles.label}>选词后自动朗读</Text>
              <Switch
                checked={settings.autoSpeak}
                color="#2bb6c4"
                onChange={(e) => updateSettings({ autoSpeak: e.detail.value })}
              />
            </View>
            <Button className={styles.btnTest} onClick={handleTestSpeak}>
              测试语音
            </Button>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>关于</View>
          <View className={styles.card}>
            <View className={styles.row}>
              <Text className={styles.label}>版本</Text>
              <Text className={styles.value}>0.0.1</Text>
            </View>
            <View className={styles.divider} />
            <View className={styles.row}>
              <Text className={styles.label}>隐私政策</Text>
              <Text className={styles.arrow}>›</Text>
            </View>
            <View className={styles.divider} />
            <View className={styles.row}>
              <Text className={styles.label}>使用指南</Text>
              <Text className={styles.arrow}>›</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default MinePage;
