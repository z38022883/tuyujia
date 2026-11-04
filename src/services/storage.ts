// ===== 本地存储服务：小程序 Storage 的同步增删查改封装 =====
import Taro from '@tarojs/taro';

/**
 * 本地存储封装（同步，兼容多端），各 store 持久化的统一入口。
 * - 查 get(key, fallback)：读指定 key，空值/异常时返回 fallback
 * - 增/改 set(key, value)：写入/覆盖指定 key
 * - 删 remove(key)：移除指定 key
 */
export const storage = {
  /** 查：输入 key（存储键名，见 STORAGE_KEYS）、fallback（缺省值，类型同 T）；输出 key 对应值或 fallback */
  get<T>(key: string, fallback: T): T {
    try {
      const v = Taro.getStorageSync(key);
      if (v === '' || v === undefined || v === null) return fallback;
      return v as T;
    } catch (err) {
      console.error('[Storage] get failed:', key, err);
      return fallback;
    }
  },
  /** 增/改：输入 key（存储键名）、value（任意可序列化值）；输出无（写入失败仅打日志） */
  set<T>(key: string, value: T): void {
    try {
      Taro.setStorageSync(key, value);
    } catch (err) {
      console.error('[Storage] set failed:', key, err);
    }
  },
  /** 删：输入 key（存储键名）；输出无 */
  remove(key: string): void {
    try {
      Taro.removeStorageSync(key);
    } catch (err) {
      console.error('[Storage] remove failed:', key, err);
    }
  }
};

export const STORAGE_KEYS = {
  settings: 'tuyujia_settings',
  expressions: 'tuyujia_expressions',
  savedPhrases: 'tuyujia_saved_phrases',
  user: 'tuyujia_user',
  rehabLevel: 'tuyujia_rehab_level',
  rehabSessions: 'tuyujia_rehab_sessions',
  rehabActiveSession: 'tuyujia_rehab_active_session',
  tcmCheckIns: 'tuyujia_tcm_check_ins',
  tcmBadges: 'tuyujia_tcm_badges',
  patientProfile: 'tuyujia_patient_profile',
  /** 角色首检引导「暂不选择」标记（true 后不再强弹角色页） */
  rolePromptDismissed: 'tuyujia_role_prompt_dismissed',
  assessments: 'tuyujia_assessments',
  /** 康复页最近一次已提示「评估调级」的档案 updatedAt（去重横幅） */
  rehabAppliedProfileAt: 'tuyujia_rehab_applied_profile_at',
  /** 康复页「按短板加权出题」开关（缺省开） */
  rehabDimWeight: 'tuyujia_rehab_dim_weight'
} as const;
