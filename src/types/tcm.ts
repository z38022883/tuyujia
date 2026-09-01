// ===== 中医辅助训练模块类型 =====
// 对应 docs/A.中医元素调研.docx 三条可迁移建议：
// ① 穴位按揉（经络按摩小游戏）② 五行音乐调息 ③ 情志调摄 + 嘴巴小练习

/** 训练项目类型 */
export type TcmPracticeType = 'acupoint' | 'relax' | 'mouth'

/** 体表安全穴位（居家按揉，避开舌下等危险区域） */
export interface TcmAcupoint {
  id: string
  name: string
  emoji: string
  /** 通俗位置描述（体表安全区） */
  location: string
  /** 家属操作手法（通俗文案） */
  method: string
  /** 单次按揉时长（秒） */
  durationSec: number
  /** 力度提示 */
  pressure: string
}

/** 五行音乐调息套餐 */
export interface TcmRelaxPack {
  id: string
  name: string
  /** 类别：舒缓 / 安神 */
  category: 'soothe' | 'calm'
  emoji: string
  /** 时长（秒）：60 / 180 */
  durationSec: number
  desc: string
}

/** 嘴巴小练习（基础口腔动作训练） */
export interface TcmMouthExercise {
  id: string
  name: string
  emoji: string
  /** 动作说明（家属陪同线下完成） */
  instruction: string
  /** 建议次数 */
  reps: string
}

/** 打卡记录 */
export interface TcmCheckIn {
  id: string
  type: TcmPracticeType
  at: number
  durationSec: number
}

/** 虚拟小勋章 */
export interface TcmBadge {
  key: string
  name: string
  emoji: string
  desc: string
}
