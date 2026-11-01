// ===== 评估四维分 → 出题维度权重 =====
// 短板加权：分数越低的维度权重越大（∝ 100 - score），
// 未评估维度按中性 70 分处理；全部未评估时不加权（返回 undefined 均匀出题）。

import type { AssessmentDimensions } from '@/types/assessment'
import type { RehabDimension } from '@/types/rehab'

const DIM_KEYS: RehabDimension[] = ['listening', 'speaking', 'reading', 'writing']

const NEUTRAL_WEIGHT = 30 // 等价 70 分（100 - 70）

export function dimWeightsFromScores(
  scores?: AssessmentDimensions
): Partial<Record<RehabDimension, number>> | undefined {
  if (!scores) return undefined
  const weights = {} as Partial<Record<RehabDimension, number>>
  let hasReal = false
  for (const d of DIM_KEYS) {
    const v = scores[d]
    if (typeof v === 'number') {
      weights[d] = Math.max(1, Math.round(100 - v))
      hasReal = true
    } else {
      weights[d] = NEUTRAL_WEIGHT
    }
  }
  return hasReal ? weights : undefined
}
