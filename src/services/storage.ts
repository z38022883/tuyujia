import Taro from '@tarojs/taro';

/** 本地存储封装（同步，兼容多端） */
export const storage = {
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
  set<T>(key: string, value: T): void {
    try {
      Taro.setStorageSync(key, value);
    } catch (err) {
      console.error('[Storage] set failed:', key, err);
    }
  },
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
  patientProfile: 'tuyujia_patient_profile'
} as const;
