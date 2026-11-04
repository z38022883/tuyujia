// ===== 开发者工具页（实地调试用）：状态一览、真机调试面板开关、缓存管理、快捷入口 =====
// 入口：我的页「版本」行连点 5 次（隐藏入口，不上 TabBar）；开启标记存 STORAGE_KEYS.devMode。
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { useUserStore } from '@/store/useUserStore';
import { useProfileStore } from '@/store/useProfileStore';
import { roleLabel } from '@/utils/role-display';
import styles from './index.module.scss';

/** 查：读取当前状态快照（每次进页/回页刷新，直接读缓存与 store，输入无） */
function readSnapshot() {
  const user = useUserStore.getState().user;
  const profile = useProfileStore.getState().profile;
  return {
    env: process.env.TARO_ENV || '',
    cloudEnv: process.env.TARO_APP_CLOUD_ENV || '（空=默认环境）',
    openid: user?.openid || '-',
    nickname: user?.nickname || '-',
    role: user ? roleLabel(user.role) || '未标注' : '未登录',
    severity: profile?.severity || '未设置',
    profileSource: profile?.source || '-',
    roleDismissed: storage.get<boolean>(STORAGE_KEYS.rolePromptDismissed, false),
    devMode: storage.get<boolean>(STORAGE_KEYS.devMode, false)
  };
}

function DevPage() {
  const [snap, setSnap] = useState(readSnapshot);
  const [debugOn, setDebugOn] = useState(false);

  useDidShow(() => {
    setSnap(readSnapshot());
  });

  const refresh = () => setSnap(readSnapshot());

  // 真机 vConsole 开关（开发者工具模拟器里无效果，真机生效）
  const toggleDebug = () => {
    Taro.setEnableDebug({ enableDebug: !debugOn })
      .then(() => {
        setDebugOn(!debugOn);
        Taro.showToast({
          title: debugOn ? '已关闭真机调试' : '已开启真机调试',
          icon: 'success'
        });
      })
      .catch((err) => {
        console.error('[Dev] setEnableDebug:', err);
        Taro.showToast({ title: '开关失败，看 console', icon: 'none' });
      });
  };

  // 重置首启门禁：清程度档案 + 角色引导标记 + 用户缓存 → 回首页完整走一遍新用户链路
  const resetFirstRun = () => {
    storage.remove(STORAGE_KEYS.patientProfile);
    storage.remove(STORAGE_KEYS.rolePromptDismissed);
    storage.remove(STORAGE_KEYS.user);
    useUserStore.setState({ user: null });
    useProfileStore.setState({ profile: null });
    refresh();
    Taro.showToast({ title: '已重置，回首页', icon: 'none' });
    setTimeout(() => Taro.reLaunch({ url: '/pages/home/index' }), 600);
  };

  const clearKey = (key: string, label: string) => {
    storage.remove(key);
    refresh();
    Taro.showToast({ title: `已清除${label}`, icon: 'none' });
  };

  const clearAll = () => {
    Taro.clearStorageSync();
    useUserStore.setState({ user: null });
    useProfileStore.setState({ profile: null });
    refresh();
    Taro.showToast({ title: '已清除全部本地缓存', icon: 'none' });
  };

  // 复制诊断信息（实地反馈问题用：贴到聊天里即可定位环境/账号/档案状态）
  const copyDiagnostics = () => {
    const lines = [
      '[图语家诊断]',
      `版本 0.0.1 | 端=${snap.env} | 云环境=${snap.cloudEnv}`,
      `openid=${snap.openid}`,
      `昵称=${snap.nickname} | 角色=${snap.role}`,
      `程度=${snap.severity}(${snap.profileSource}) | 角色引导已跳过=${snap.roleDismissed}`
    ];
    Taro.setClipboardData({ data: lines.join('\n') }).catch(() => {});
  };

  const closeDevMode = () => {
    storage.set(STORAGE_KEYS.devMode, false);
    Taro.showToast({ title: '已退出开发者模式', icon: 'none' });
    setTimeout(() => Taro.switchTab({ url: '/pages/mine/index' }), 600);
  };

  const navTo = (url: string) => Taro.navigateTo({ url });

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.sectionTitle}>当前状态</View>
        <View className={styles.card}>
          <View className={styles.row}>
            <Text className={styles.label}>端 / 云环境</Text>
            <Text className={styles.value}>{snap.env} / {snap.cloudEnv}</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.row}>
            <Text className={styles.label}>openid</Text>
            <Text className={styles.value}>{snap.openid.slice(0, 14)}</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.row}>
            <Text className={styles.label}>昵称 / 角色</Text>
            <Text className={styles.value}>{snap.nickname || '-'} / {snap.role}</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.row}>
            <Text className={styles.label}>程度档案</Text>
            <Text className={styles.value}>
              {snap.severity}
              {snap.profileSource !== '-' ? `（${snap.profileSource === 'assess' ? '评估' : '手动'}）` : ''}
            </Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.row}>
            <Text className={styles.label}>角色引导已跳过</Text>
            <Text className={styles.value}>{snap.roleDismissed ? '是' : '否'}</Text>
          </View>
        </View>

        <View className={styles.sectionTitle}>真机调试</View>
        <View className={styles.card}>
          <View className={styles.rowBtn} onClick={toggleDebug}>
            <Text className={styles.label}>vConsole 调试面板</Text>
            <Text className={styles.action}>{debugOn ? '关闭' : '开启'}</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.rowBtn} onClick={copyDiagnostics}>
            <Text className={styles.label}>复制诊断信息</Text>
            <Text className={styles.action}>复制</Text>
          </View>
        </View>

        <View className={styles.sectionTitle}>缓存管理</View>
        <View className={styles.card}>
          <View className={styles.rowBtn} onClick={resetFirstRun}>
            <Text className={styles.label}>重置首启门禁（模拟新用户）</Text>
            <Text className={styles.action}>重置</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.rowBtn} onClick={() => clearKey(STORAGE_KEYS.rolePromptDismissed, '角色引导标记')}>
            <Text className={styles.label}>清除角色引导标记</Text>
            <Text className={styles.action}>清除</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.rowBtn} onClick={() => clearKey(STORAGE_KEYS.patientProfile, '程度档案')}>
            <Text className={styles.label}>清除程度档案</Text>
            <Text className={styles.action}>清除</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.rowBtn} onClick={clearAll}>
            <Text className={styles.labelDanger}>清除全部本地缓存</Text>
            <Text className={styles.actionDanger}>清除</Text>
          </View>
        </View>

        <View className={styles.sectionTitle}>快捷入口</View>
        <View className={styles.card}>
          <View className={styles.linkGroup}>
            <View className={styles.link} onClick={() => navTo('/pages/role/index?from=gate')}>
              <Text>角色选择页</Text>
            </View>
            <View className={styles.link} onClick={() => navTo('/pages/level/index')}>
              <Text>程度选择页</Text>
            </View>
            <View className={styles.link} onClick={() => navTo('/pages/assessment/entry/index')}>
              <Text>评估录入</Text>
            </View>
            <View className={styles.link} onClick={() => navTo('/pages/rehab/index')}>
              <Text>康复训练</Text>
            </View>
            <View className={styles.link} onClick={() => navTo('/pages/tcm/index')}>
              <Text>中医辅助</Text>
            </View>
          </View>
        </View>

        <View className={styles.btnClose} onClick={closeDevMode}>
          退出开发者模式
        </View>
      </ScrollView>
    </View>
  );
}

export default DevPage;
