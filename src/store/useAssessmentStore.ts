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

  /**
   * 查：从本地存储恢复评估记录列表。
   * 输入：无；输出：无（写入 state：assessments = AssessmentResult[]）
   */
  load: () => {
    const assessments = storage.get<AssessmentResult[]>(
      STORAGE_KEYS.assessments,
      []
    )
    set({ assessments })
  },

  /**
   * 增：新增一条评估记录，并同步写入患者程度档案（source='assess'）。
   * 输入 input: AddAssessmentInput {
   *   aqScore?: number            // WAB 失语商 AQ 分（无量表分时缺省）
   *   severity: 'severe' | 'moderate' | 'mild'  // 评估档位（必填）
   *   dimensions?: AssessmentDimensions  // 四维得分
   *   assessedAt: number          // 评估时间戳（必填）
   *   note?: string               // 备注（评估场景、量表名称等）
   *   source?: AssessmentSource   // 来源，默认 'manual-entry'
   * }
   * 输出：AssessmentResult – 完整记录 { assessmentId, ..., version: 1 }。
   * 副作用：assessments 头插（保留最近 20 条）+ 本地持久化 + useProfileStore.applyAssessment 联动
   */
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

  /**
   * 删：按 id 删除一条评估记录（不影响已写入档案的档位）。
   * 输入：assessmentId – AssessmentResult.assessmentId；输出：无。
   * 副作用：更新 assessments + 本地持久化
   */
  removeAssessment: (assessmentId) => {
    const assessments = get().assessments.filter(
      (a) => a.assessmentId !== assessmentId
    )
    set({ assessments })
    storage.set(STORAGE_KEYS.assessments, assessments)
  }
}))
