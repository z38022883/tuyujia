// ===== 中医辅助训练数据层 =====
// 内容源自《A.中医元素调研》三条可迁移建议：
// ① 穴位按揉：体表安全穴位 + 家属操作手法 + 免责提示
// ② 五行音乐疗法：轻量化调息套餐（1/3 分钟）
// ③ 情志调摄 + 嘴巴小练习：暖心提示短句 + 基础口腔动作

import type {
  TcmAcupoint,
  TcmBadge,
  TcmMouthExercise,
  TcmRelaxPack
} from '@/types/tcm'

// ===== 穴位按揉（仅体表安全穴位，避开舌下危险区域）=====

export const TCM_ACUPOINTS: TcmAcupoint[] = [
  {
    id: 'hegu',
    name: '合谷穴',
    emoji: '✋',
    location: '手背虎口处，大拇指和食指中间',
    method: '用另一只手的大拇指轻柔打圈按揉',
    durationSec: 30,
    pressure: '微微酸胀即可，不要太用力'
  },
  {
    id: 'lianquan',
    name: '廉泉穴',
    emoji: '🧣',
    location: '脖子前面，下巴和喉咙之间的凹处',
    method: '用指腹轻轻点按，慢慢加深',
    durationSec: 30,
    pressure: '轻柔为主，感到舒适即可'
  },
  {
    id: 'tongli',
    name: '通里穴',
    emoji: '⌚',
    location: '手腕内侧，靠小指一侧的凹陷处',
    method: '用拇指指腹轻揉，配合深呼吸',
    durationSec: 30,
    pressure: '力度轻缓，节奏放慢'
  }
]

export const TCM_ACUPOINT_DISCLAIMER =
  '穴位按揉仅作为居家保健辅助，不能替代临床针灸治疗。如有不适请立即停止并咨询医生。'

// ===== 音乐调息套餐（轻量化：1 / 3 分钟）=====

export const TCM_RELAX_PACKS: TcmRelaxPack[] = [
  {
    id: 'soothe-1',
    name: '舒缓一分钟',
    category: 'soothe',
    emoji: '🍃',
    durationSec: 60,
    desc: '跟着呼吸节奏放松，训练前做一做，说话更放松'
  },
  {
    id: 'calm-1',
    name: '安神一分钟',
    category: 'calm',
    emoji: '🌙',
    durationSec: 60,
    desc: '轻轻呼吸，把紧张的情绪放一放'
  },
  {
    id: 'soothe-3',
    name: '舒缓三分钟',
    category: 'soothe',
    emoji: '🌿',
    durationSec: 180,
    desc: '完整的放松练习，适合午后或训练前使用'
  },
  {
    id: 'calm-3',
    name: '安神三分钟',
    category: 'calm',
    emoji: '🕯️',
    durationSec: 180,
    desc: '睡前来一次，安安稳稳休息'
  }
]

/** 呼吸引导节奏（秒）：吸气 → 停一停 → 呼气 */
export const TCM_BREATH_PHASES: { key: 'inhale' | 'hold' | 'exhale'; label: string; durationSec: number }[] = [
  { key: 'inhale', label: '慢慢吸气', durationSec: 4 },
  { key: 'hold', label: '停一停', durationSec: 2 },
  { key: 'exhale', label: '缓缓呼气', durationSec: 6 }
]

// ===== 嘴巴小练习（基础口腔动作，家属陪同完成）=====

export const TCM_MOUTH_EXERCISES: TcmMouthExercise[] = [
  {
    id: 'tongue-up-down',
    name: '舌头上下动',
    emoji: '😛',
    instruction: '舌头慢慢向上抬，再慢慢放下，像点头一样',
    reps: '做 5 次'
  },
  {
    id: 'tongue-left-right',
    name: '舌头左右动',
    emoji: '😗',
    instruction: '舌头向左伸一伸，再向右伸一伸',
    reps: '左右各 5 次'
  },
  {
    id: 'show-teeth',
    name: '龇牙',
    emoji: '😁',
    instruction: '嘴角向两边拉开，露出牙齿，保持几秒再放松',
    reps: '做 5 次'
  },
  {
    id: 'puff-cheeks',
    name: '鼓腮',
    emoji: '😗',
    instruction: '像吹气球一样把两颊鼓起来，坚持几秒再放松',
    reps: '做 5 次'
  },
  {
    id: 'crack-seeds',
    name: '模拟嗑瓜子',
    emoji: '🥜',
    instruction: '嘴巴做小小的开合动作，像轻轻嗑瓜子一样',
    reps: '做 10 次'
  }
]

export const TCM_MOUTH_NOTE =
  '练习不需要打分，家属陪同完成即可。累了随时跳过，休息一下再来也可以。'

// ===== 情志调摄 · 暖心提示短句（每次打开随机一条）=====

export const TCM_WARM_TIPS: string[] = [
  '慢慢沟通不用着急，好的心情更利于日常交流。',
  '累了就先休息一会，不用勉强自己表达。',
  '说不好没关系，家人愿意慢慢等你。',
  '每天一点点，进步就在不知不觉里。',
  '深呼吸一下，放松了再开口也不迟。',
  '陪伴本身就是最好的鼓励。'
]

// ===== 虚拟小勋章 =====

export const TCM_BADGES: TcmBadge[] = [
  { key: 'first-acupoint', name: '初次按揉', emoji: '🏅', desc: '完成第一次穴位按揉' },
  { key: 'first-relax', name: '初次调息', emoji: '🎐', desc: '完成第一次音乐调息' },
  { key: 'first-mouth', name: '初次练习', emoji: '🎖️', desc: '完成第一次嘴巴小练习' },
  { key: 'streak-3', name: '坚持三天', emoji: '🌟', desc: '连续三天完成训练' },
  { key: 'streak-7', name: '坚持七天', emoji: '🏆', desc: '连续七天完成训练' }
]

export function getRandomWarmTip(): string {
  return TCM_WARM_TIPS[Math.floor(Math.random() * TCM_WARM_TIPS.length)]
}
