// ===== 患者程度档案状态（轻/中/重自选）=====
// 首页保留功能卡片，程度只作用于 说/听/康复 的内容与展示（v0.2 方案）。

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/services/storage'
import type { PatientProfile, PatientSeverity } from '@/types/profile'

interface ProfileState {
  /** null = 尚未选择（首启门禁用） */
  profile: PatientProfile | null
  load: () => void
  setSeverity: (severity: PatientSeverity) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,

  load: () => {
    const profile = storage.get<PatientProfile | null>(
      STORAGE_KEYS.patientProfile,
      null
    )
    set({ profile })
  },

  setSeverity: (severity) => {
    const profile: PatientProfile = {
      severity,
      updatedAt: Date.now(),
      source: 'self'
    }
    set({ profile })
    storage.set(STORAGE_KEYS.patientProfile, profile)
  }
}))
