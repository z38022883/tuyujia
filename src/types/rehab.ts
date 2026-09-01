// ===== 康复训练模块类型（框架 v0.1）=====
// 对应 docs/康复训练模块方案.md；题库与分级接口待后续填充

/** 训练等级（手动选择；后续接入分级模块后由 AssessmentResult.severity 驱动） */
export type RehabLevel = 'severe' | 'moderate' | 'mild'

/** 训练维度（源自 docs/2.txt 的四大训练内容） */
export type RehabDimension = 'listening' | 'speaking' | 'reading' | 'writing'

/** 题型枚举（先定义全量，便于题库建设时对齐；渲染组件逐个补齐） */
export type RehabTaskType =
  | 'pick-from-pictograms' // 听词指认：TTS 读词 → 图符选择
  | 'match-pair' // 图文配对
  | 'instruction-check' // 听指令执行（陪护确认）
  | 'follow-read' // 跟读复述
  | 'describe-picture' // 看图描述
  | 'categorize' // 词汇分类
  | 'listen-recall' // 听短文复述
  | 'reading-comprehension' // 阅读理解
  | 'trace-char' // 汉字临摹
  | 'idiom-read' // 成语朗读
  | 'melody-hum' // 旋律哼唱
  | 'script-dialogue' // 生活脚本对话

/** 单题素材（文字 / 图符 / 图片，至少一种） */
export interface RehabMaterial {
  text?: string
  pictogramIds?: string[]
  imageUrl?: string
}

/** 训练任务定义（题库条目） */
export interface RehabTask {
  id: string
  taskType: RehabTaskType
  title: string
  level: RehabLevel
  dimension: RehabDimension
  difficulty: number
  prompt: string
  materials: RehabMaterial[]
  enabled: boolean
}

/** 单题作答记录 */
export interface RehabTaskRecord {
  taskId: string
  taskType: RehabTaskType
  dimension: RehabDimension
  correct?: boolean
  rating?: number
  durationSec: number
}

/** 一次训练会话（任务列表为开始时的快照） */
export interface RehabSession {
  id: string
  level: RehabLevel
  startedAt: number
  finishedAt?: number
  durationSec: number
  totalTasks: number
  completedTasks: number
  tasks: RehabTask[]
  taskRecords: RehabTaskRecord[]
}

/** 等级元信息（展示用） */
export interface RehabLevelMeta {
  key: RehabLevel
  label: string
  aqRange: string
  desc: string
  sessionHint: string
}
