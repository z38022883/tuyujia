// ===== 我的页（TabBar）：账号角色设置、TTS 设置（语速/音色/自动朗读，试听）与患者程度档案展示 =====
// user 状态统一走 useUserStore（本地缓存 + login 云函数刷新），本页不再各自管 user 缓存。
// 隐藏入口：「版本」行 2 秒内连点 5 次 → 开启开发者模式并进入开发者工具页（实地调试用）。
import { useEffect, useRef, useState } from 'react';
import { View, Text, Button, Slider, Switch, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppStore } from '@/store/useAppStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useUserStore } from '@/store/useUserStore';
import { callFunction } from '@/services/cloud';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { speak } from '@/services/tts';
import { normalizeRole, roleLabel } from '@/utils/role-display';
import { REHAB_LEVEL_MAP } from '@/data/rehab-meta';
import type { User } from '@/types';
import styles from './index.module.scss';

const VOICES = [
  { id: 'female', name: '女声' },
  { id: 'male', name: '男声' }
];

function MinePage() {
  const { settings, updateSettings } = useAppStore();
  const severity = useProfileStore((s) => s.profile?.severity ?? null);
  const profileSource = useProfileStore((s) => s.profile?.source ?? null);
  const aqScore = useProfileStore((s) => s.profile?.aqScore ?? null);
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const role = normalizeRole(user?.role);
  const [rate, setRate] = useState(settings.rate);
  const [devMode, setDevMode] = useState(false);
  // 「版本」行连点计数（2 秒窗口，5 次开启开发者模式）
  const tapCount = useRef(0);
  const lastTapAt = useRef(0);

  useEffect(() => {
    setRate(settings.rate);
  }, [settings.rate]);

  // 开发者模式标记在 dev 页可被关闭，每次回本页重读
  useDidShow(() => {
    setDevMode(storage.get<boolean>(STORAGE_KEYS.devMode, false));
  });

  useEffect(() => {
    callFunction<{ openid: string; user: User }>('login')
      .then((res) => {
        if (!res) return; // H5 预览模式跳过（读本地缓存）
        setUser(res.user); // store 统一写缓存 + state
      })
      .catch((err) => console.error('[Mine] login:', err));
  }, []);

  const handleTestSpeak = () => {
    speak('你好，这是图语家的语音测试', settings).catch((err) =>
      console.error('[Mine] test speak:', err)
    );
  };

  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastTapAt.current > 2000) tapCount.current = 0;
    lastTapAt.current = now;
    tapCount.current += 1;
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      storage.set(STORAGE_KEYS.devMode, true);
      setDevMode(true);
      Taro.showToast({ title: '已开启开发者模式', icon: 'none' });
      Taro.navigateTo({ url: '/pages/dev/index' });
    }
  };

  const goDev = () => {
    Taro.navigateTo({ url: '/pages/dev/index' });
  };

  const goRole = () => {
    Taro.navigateTo({ url: '/pages/role/index' });
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
            <View className={styles.userMetaRow}>
              {role && (
                <View className={styles.userRoleTag}>
                  <Text>{roleLabel(role)}</Text>
                </View>
              )}
              <View className={styles.uid}>
                {user?.openid ? `ID: ${user.openid.slice(0, 10)}` : '未登录'}
              </View>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>账号角色</View>
          <View className={styles.card}>
            <View className={styles.row} onClick={goRole}>
              <Text className={styles.label}>当前角色</Text>
              <View className={styles.valueWrap}>
                {role ? (
                  <View
                    className={classnames(
                      styles.roleTag,
                      role === 'patient' ? styles.roleTagPatient : styles.roleTagFamily
                    )}
                  >
                    <Text>{roleLabel(role)}</Text>
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
          <View className={styles.sectionTitle}>患者程度</View>
          <View className={styles.card}>
            <View className={styles.row} onClick={goLevel}>
              <Text className={styles.label}>沟通程度</Text>
              <View className={styles.valueWrap}>
                {severity ? (
                  <View className={styles.valueWrap}>
                    <View className={styles.sevTag}>
                      <Text>{REHAB_LEVEL_MAP[severity].label}</Text>
                    </View>
                    <View
                      className={classnames(
                        styles.sourceTag,
                        profileSource === 'assess' && styles.sourceTagAssess
                      )}
                    >
                      <Text>
                        {profileSource === 'assess'
                          ? aqScore !== undefined && aqScore !== null
                            ? `评估 AQ ${aqScore}`
                            : '评估确定'
                          : '手动设置'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text className={styles.value}>未设置</Text>
                )}
                <Text className={styles.arrow}>›</Text>
              </View>
            </View>
            <View className={styles.divider} />
            <View
              className={styles.row}
              onClick={() => Taro.navigateTo({ url: '/pages/assessment/entry/index' })}
            >
              <Text className={styles.label}>评估录入</Text>
              <View className={styles.valueWrap}>
                <Text className={styles.value}>录入 AQ / 四维得分</Text>
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
              activeColor="#4a9c6e"
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
                color="#4a9c6e"
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
            {devMode && (
              <>
                <View className={styles.row} onClick={goDev}>
                  <Text className={styles.label}>开发者工具</Text>
                  <Text className={styles.arrow}>›</Text>
                </View>
                <View className={styles.divider} />
              </>
            )}
            <View className={styles.row} onClick={handleVersionTap}>
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
