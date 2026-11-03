// ===== 患者程度档案状态（自选 + 评估覆盖）=====
// 首页保留功能卡片，程度只作用于 说/听/康复 的内容与展示（v0.2 方案）。
// source='self'：照护者手动选择；source='assess'：评估结果写入（含 AQ/四维分），
// 评估优先，手动切档可覆盖（见康复页确认弹窗）。

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/services/storage'
import type { AssessmentDimensions } from '@/types/assessment'
import type { PatientProfile, PatientSeverity } from '@/types/profile'

interface ProfileState {
  /** null = 尚未选择（首启门禁用） */
  profile: PatientProfile | null
  load: () => void
  setSeverity: (severity: PatientSeverity) => void
  /**
   * 评估结果写入档案（source 恒为 'assess'）：
   * 等级 + AQ 分 + 四维分一起落档，供康复页调级横幅与短板加权出题消费。
   */
  applyAssessment: (input: {
    severity: PatientSeverity
    aqScore?: number
    dimensions?: AssessmentDimensions
    assessedAt: number
  }) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,

  /**
   * 查：从本地存储恢复患者程度档案。
   * 输入：无；输出：无（写入 state：profile = PatientProfile | null）
   */
  load: () => {
    const profile = storage.get<PatientProfile | null>(
      STORAGE_KEYS.patientProfile,
      null
    )
    set({ profile })
  },

  /**
   * 增/改：照护者手动设置程度档位（覆盖旧档案）。
   * 输入：severity – 'severe' | 'moderate' | 'mild'；输出：无。
   * 副作用：写入 profile { severity, updatedAt, source='self' } + 本地持久化
   */
  setSeverity: (severity) => {
    const profile: PatientProfile = {
      severity,
      updatedAt: Date.now(),
      source: 'self'
    }
    set({ profile })
    storage.set(STORAGE_KEYS.patientProfile, profile)
  },

  /**
   * 增/改：评估结果写入档案（source 恒为 'assess'，覆盖手动档位）。
   * 输入：{ severity: PatientSeverity        // 评估档位
   *        aqScore?: number                  // WAB 失语商 AQ 分
   *        dimensions?: AssessmentDimensions // 四维得分（听/说/读/写 0-100）
   *        assessedAt: number }              // 评估时间戳
   * 输出：无。副作用：写入 profile + 本地持久化（康复页据此调级横幅 + 短板加权出题）
   */
  applyAssessment: ({ severity, aqScore, dimensions, assessedAt }) => {
    const profile: PatientProfile = {
      severity,
      updatedAt: Date.now(),
      source: 'assess',
      aqScore,
      dimensions,
      assessedAt
    }
    set({ profile })
    storage.set(STORAGE_KEYS.patientProfile, profile)
  }
}))
