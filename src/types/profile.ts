// ===== 患者程度档案（轻/中/重自选 + 评估覆盖）=====
// 对应 docs/产品方案/患者程度自选与功能适配方案.md
// 枚举值与康复模块 RehabLevel（types/rehab.ts）共用同一组字符串值，可直接互转。

import type { AssessmentDimensions } from './assessment'

/** 患者沟通程度：severe=重度 / moderate=中度 / mild=轻度 */
export type PatientSeverity = 'severe' | 'moderate' | 'mild'

/** 程度来源：self=照护者自选；assess=分级评估结果（评估录入后覆盖 self） */
export type SeveritySource = 'self' | 'assess'

export interface PatientProfile {
  severity: PatientSeverity
  updatedAt: number
  source: SeveritySource
  /** 最近评估 AQ 分（source='assess' 时存在） */
  aqScore?: number
  /** 最近评估四维得分（康复出题短板加权用） */
  dimensions?: AssessmentDimensions
  /** 最近评估时间戳 */
  assessedAt?: number
}
