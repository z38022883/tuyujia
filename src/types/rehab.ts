// ===== 康复训练模块类型（v0.2：题型载荷 + 判分口径）=====
// 对应 docs/康复训练模块方案.md；题库数据见 src/data/rehab/（manual + generated）
//
// 判分口径（题型组件与结果页按此实现）：
// - 客观题（pick-from-pictograms / match-pair / reading-comprehension）：自动判分
// - 陪护确认题（instruction-check / script-dialogue）：照护者标记完成与否
// - 星级题（follow-read / describe-picture / idiom-read / melody-hum / listen-recall）：
//   记 1-5 星（患者自评或照护者评），correct = rating >= 3 仅供统计
// - trace-char：只记完成（correct 恒 true），不判字形

/** 训练等级（手动选择；后续接入分级模块后由 AssessmentResult.severity 驱动） */
export type RehabLevel = 'severe' | 'moderate' | 'mild'

/** 训练维度（源自 docs/2.txt 的四大训练内容） */
export type RehabDimension = 'listening' | 'speaking' | 'reading' | 'writing'

/** 题型枚举（12 种，与申报表口径一致） */
export type RehabTaskType =
  | 'pick-from-pictograms' // 听词指认/看字选图：TTS 读词或显示文字 → 图符选择
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

// ===== 题型专属载荷（判别联合，按 taskType 区分）=====

export interface PickFromPictogramsPayload {
  taskType: 'pick-from-pictograms'
  /** 目标词（listen 变体由 TTS 朗读；read 变体以大字展示） */
  word: string
  /** 答案图符 id */
  answerId: string
  /** 选项图符 id（含 answerId，渲染时打乱） */
  optionIds: string[]
  /** listen=听词选图（听理解）；read=看字选图（阅读）。默认 listen */
  variant?: 'listen' | 'read'
}

export interface MatchPairPayload {
  taskType: 'match-pair'
  /** 词卡 ↔ 图卡两两配对 */
  pairs: { text: string; pictogramId: string }[]
}

export interface InstructionCheckPayload {
  taskType: 'instruction-check'
  /** 1~2 步指令文本（TTS 朗读，照护者确认患者执行） */
  steps: string[]
  /** 提示图符（照护者按「看提示」展开，避免提前剧透答案） */
  hintIds?: string[]
}

export interface FollowReadPayload {
  taskType: 'follow-read'
  /** 跟读内容（范读 → 复述 → 星级评价） */
  sentence: string
  pictogramIds?: string[]
}

export interface DescribePicturePayload {
  taskType: 'describe-picture'
  /** 场景图符（1~3 张） */
  scenePictogramIds: string[]
  /** 描述要点（照护者对照评星） */
  keyPoints: string[]
}

export interface CategorizePayload {
  taskType: 'categorize'
  /** 类目桶 */
  categories: { key: string; label: string }[]
  /** 词块 → 正确类目 key */
  items: { id: string; category: string }[]
}

export interface ListenRecallPayload {
  taskType: 'listen-recall'
  /** 短文（≤140 字，TTS 单次上限 150） */
  passage: string
  /** 复述要点（照护者对照评星） */
  keyPoints: string[]
}

export interface ReadingComprehensionPayload {
  taskType: 'reading-comprehension'
  passage: string
  question: string
  options: string[]
  answerIndex: number
}

export interface TraceCharPayload {
  taskType: 'trace-char'
  /** 临摹对象：重度单字，中度短词/短句 */
  text: string
  pinyin?: string
}

export interface IdiomReadPayload {
  taskType: 'idiom-read'
  idiom: string
  meaning: string
}

export interface MelodyHumPayload {
  taskType: 'melody-hum'
  song: string
  lyrics: string
}

export interface ScriptDialoguePayload {
  taskType: 'script-dialogue'
  scenario: string
  /** 对话轮次：照护者念 caregiver 句，患者回应 patient 句 */
  turns: {
    role: 'caregiver' | 'patient'
    line: string
    /** 该轮提示图符（照护者按需展开） */
    hintIds?: string[]
  }[]
}

export type RehabTaskPayload =
  | PickFromPictogramsPayload
  | MatchPairPayload
  | InstructionCheckPayload
  | FollowReadPayload
  | DescribePicturePayload
  | CategorizePayload
  | ListenRecallPayload
  | ReadingComprehensionPayload
  | TraceCharPayload
  | IdiomReadPayload
  | MelodyHumPayload
  | ScriptDialoguePayload

/** 训练任务定义（题库条目） */
export interface RehabTask {
  id: string
  taskType: RehabTaskType
  title: string
  level: RehabLevel
  dimension: RehabDimension
  /** 难度 1-5（同维度内出题排序参考） */
  difficulty: number
  /** 题干（展示文本；朗读文本由各题型载荷决定） */
  prompt: string
  /** 题型专属载荷 */
  payload: RehabTaskPayload
  /** 平行组 id：同组考察同一目标词/场景（每组 ≥3 套素材防学习效应），校验脚本用 */
  parallelGroup?: string
  enabled: boolean
}

/** 单题作答记录 */
export interface RehabTaskRecord {
  taskId: string
  taskType: RehabTaskType
  dimension: RehabDimension
  correct?: boolean
  /** 星级题 1-5 */
  rating?: number
  /** 作答内容摘要（如所选选项文字），供回看 */
  answer?: string
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
