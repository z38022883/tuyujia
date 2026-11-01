// ===== 分级评估记录状态（闭环）=====
// 评估来源：① 评估录入页（照护者填写量表结果）；② 结构化评估模块（后续接入，
// 走同一条 addAssessment 写入路径）。
// 写入即生效：同步更新患者程度档案（source='assess'）→ 康复页调级横幅 +
// 短板加权出题自动联动；评估记录保留最近 20 条。

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/services/storage'
import { useProfileStore } from '@/store/useProfileStore'
import type {
  AssessmentDimensions,
  AssessmentResult,
  AssessmentSource
} from '@/types/assessment'

const MAX_ASSESSMENTS = 20

let assessIdCounter = 0
function newAssessmentId(): string {
  assessIdCounter += 1
  return `assess_${Date.now()}_${assessIdCounter}`
}

export interface AddAssessmentInput {
  aqScore?: number
  severity: AssessmentResult['severity']
  dimensions?: AssessmentDimensions
  /** 评估日期（当天 0 点或指定时间戳） */
  assessedAt: number
  note?: string
  source?: AssessmentSource
}

interface AssessmentState {
  assessments: AssessmentResult[]
  load: () => void
  /** 新增评估并应用到档案；返回完整记录 */
  addAssessment: (input: AddAssessmentInput) => AssessmentResult
  removeAssessment: (assessmentId: string) => void
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assessments: [],

  load: () => {
    const assessments = storage.get<AssessmentResult[]>(
      STORAGE_KEYS.assessments,
      []
    )
    set({ assessments })
  },

  addAssessment: (input) => {
    const record: AssessmentResult = {
      assessmentId: newAssessmentId(),
      aqScore: input.aqScore,
      severity: input.severity,
      dimensions: input.dimensions,
      assessedAt: input.assessedAt,
      note: input.note,
      source: input.source ?? 'manual-entry',
      version: 1
    }
    const assessments = [record, ...get().assessments].slice(0, MAX_ASSESSMENTS)
    set({ assessments })
    storage.set(STORAGE_KEYS.assessments, assessments)

    // 写入即生效：档案切到评估档（康复页横幅/加权出题据此联动）
    useProfileStore.getState().applyAssessment({
      severity: record.severity,
      aqScore: record.aqScore,
      dimensions: record.dimensions,
      assessedAt: record.assessedAt
    })
    return record
  },

  removeAssessment: (assessmentId) => {
    const assessments = get().assessments.filter(
      (a) => a.assessmentId !== assessmentId
    )
    set({ assessments })
    storage.set(STORAGE_KEYS.assessments, assessments)
  }
}))
