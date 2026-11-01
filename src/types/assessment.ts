// ===== 分级评估结果（闭环数据层）=====
// 评估闭环：录入/评估模块产出 AssessmentResult → 写入档案（source='assess'）→
// 康复训练消费（等级 + 维度短板加权出题）。
// 对应 docs/康复训练模块方案.md §分级评估；AQ 分级标准源自 docs/2.txt（WAB 失语商）。

import type { PatientSeverity } from './profile'

/** 评估四维得分（0-100，越高越好；缺省维度视为未评估） */
export interface AssessmentDimensions {
  /** 听理解 */
  listening?: number
  /** 口语表达 */
  speaking?: number
  /** 阅读 */
  reading?: number
  /** 书写 */
  writing?: number
}

/** 评估来源：manual-entry=照护者手动录入；module=结构化评估模块（后续接入，走同一写入路径） */
export type AssessmentSource = 'manual-entry' | 'module'

export interface AssessmentResult {
  assessmentId: string
  /** WAB 失语商 AQ（0~93.8）；无量表分时缺省，以手动选择档位为准 */
  aqScore?: number
  /** 评估确定的语言档位 */
  severity: PatientSeverity
  /** 四维得分（用于短板加权出题） */
  dimensions?: AssessmentDimensions
  /** 评估时间戳 */
  assessedAt: number
  /** 备注（评估场景、量表名称等） */
  note?: string
  source: AssessmentSource
  /** 数据结构版本 */
  version: 1
}

/** AQ 换算档位：≤50 重度 / 51~75 中度 / 76~93.8 轻度（docs/2.txt 分级标准） */
export const AQ_MAX = 93.8

export function severityFromAq(aq: number): PatientSeverity {
  if (aq <= 50) return 'severe'
  if (aq <= 75) return 'moderate'
  return 'mild'
}
