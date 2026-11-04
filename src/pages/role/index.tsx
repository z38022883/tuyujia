// ===== 角色选择页：选择账号角色（患者/家属）→ 写入 user 档案，作为首页排序与视角的默认值 =====
// 两种入口：首检强弹（from=gate，带「暂不选择」）/ 我的页·首页徽标进入（预选当前值，无「暂不选择」）。
// 角色 = 默认视角而非硬隔离：任何角色都保留全部功能入口，这里只定排序与弱化。
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useUserStore } from '@/store/useUserStore';
import { storage, STORAGE_KEYS } from '@/services/storage';
import type { UserRole } from '@/types';
import styles from './index.module.scss';

interface RoleOption {
  key: Exclude<UserRole, ''>;
  emoji: string;
  title: string;
  summary: string;
  scope: string;
}

const OPTIONS: RoleOption[] = [
  {
    key: 'patient',
    emoji: '👤',
    title: '患者',
    summary: '患者本人使用，以表达、康复训练为主',
    scope: '表达板置顶，接收等照护者工具放后'
  },
  {
    key: 'family',
    emoji: '👪',
    title: '家属',
    summary: '家属 / 照护者使用，以接收、照护为主',
    scope: '接收展示置顶，康复训练含家属指导'
  }
];

function RolePage() {
  // 入口区分：首检强弹（gate）显示「暂不选择」；从我的页/首页徽标进入不显示
  const [fromGate] = useState(
    () => Taro.getCurrentInstance()?.router?.params?.from === 'gate'
  );
  // 预选当前角色（从我的页进入时预选当前值；首检强弹时无角色不预选）
  const [selected, setSelected] = useState<Exclude<UserRole, ''> | null>(
    () => {
      const current = useUserStore.getState().user?.role;
      return current === 'patient' || current === 'family' ? current : null;
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    const ok = await useUserStore.getState().setRole(selected);
    setSaving(false);
    if (!ok) return; // 云端失败已回滚 + toast，留在本页可重试
    Taro.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/home/index' });
    }, 400);
  };

  // 暂不选择：记 dismissed 标记（首检不再强弹），不写角色
  const handleDismiss = () => {
    storage.set(STORAGE_KEYS.rolePromptDismissed, true);
    Taro.reLaunch({ url: '/pages/home/index' });
  };

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>选择账号角色</View>
          <View className={styles.subtitle}>
            请选择本机主要使用者，可随时在「我的」页修改
          </View>
        </View>

        {OPTIONS.map((o) => {
          const active = selected === o.key;
          return (
            <View
              key={o.key}
              className={classnames(
                styles.option,
                active && o.key === 'patient' && styles.optionActivePatient,
                active && o.key === 'family' && styles.optionActiveFamily
              )}
              onClick={() => setSelected(o.key)}
            >
              <View
                className={classnames(
                  styles.icon,
                  o.key === 'patient' ? styles.iconPatient : styles.iconFamily
                )}
              >
                <Text className={styles.iconEmoji}>{o.emoji}</Text>
              </View>
              <View className={styles.optionBody}>
                <View className={styles.optionTitle}>{o.title}</View>
                <View className={styles.optionSummary}>{o.summary}</View>
                <View className={styles.optionScope}>{o.scope}</View>
              </View>
              {active && <Text className={styles.check}>✓</Text>}
            </View>
          );
        })}

        <Text className={styles.note}>
          角色只是默认视角，不影响功能使用：任何角色都能使用全部功能，首页会按角色调整功能排列。
        </Text>
      </ScrollView>

      <View className={styles.footer}>
        <View
          className={classnames(
            styles.btnSave,
            (!selected || saving) && styles.btnDisabled
          )}
          onClick={handleSave}
        >
          保存并返回
        </View>
        {fromGate && (
          <View className={styles.btnDismiss} onClick={handleDismiss}>
            暂不选择
          </View>
        )}
      </View>
    </View>
  );
}

export default RolePage;
