// ===== 中医辅助训练状态管理 =====
// 打卡记录、连续天数、虚拟勋章，本地持久化（与康复训练 store 同一模式）

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/services/storage'
import { saveUserData } from '@/services/userDataSync'
import type { TcmBadge, TcmCheckIn, TcmPracticeType } from '@/types/tcm'
import { TCM_BADGES } from '@/data/tcm'

let tcmIdCounter = 0
function newTcmId(): string {
  tcmIdCounter += 1
  return `tcm_${Date.now()}_${tcmIdCounter}`
}

function toDayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** 查：根据打卡记录计算连续打卡天数（含今天；今天未打卡则从昨天起算）。
 *  输入 checkIns: TcmCheckIn[] { id, type, at(时间戳), durationSec }；输出：连续天数 number */
export function calcStreakDays(checkIns: TcmCheckIn[]): number {
  if (!checkIns.length) return 0
  const days = new Set(checkIns.map((c) => toDayKey(c.at)))
  let streak = 0
  const cursor = new Date()
  // 若今天未打卡，从昨天起算
  if (!days.has(toDayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(toDayKey(cursor.getTime()))) return 0
  }
  while (days.has(toDayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

interface TcmState {
  /** 打卡记录（最多保留 200 条） */
  checkIns: TcmCheckIn[]
  /** 已获得的勋章 key 列表 */
  badges: string[]
  /** 本次新获得的勋章（弹提示用，展示后清除） */
  latestBadge: string | null

  addCheckIn: (type: TcmPracticeType, durationSec: number) => TcmBadge | null
  clearLatestBadge: () => void
  /** 云端回填：bootstrapSync 启动时把 user_data 云集合里的打卡+勋章合并进本地（换设备恢复） */
  mergeCloudTcm: (cloud: { checkIns: TcmCheckIn[]; badges: string[] }) => void
  loadLocalData: () => void
}

export const useTcmStore = create<TcmState>((set, get) => ({
  checkIns: [],
  badges: [],
  latestBadge: null,

  /**
   * 增：新增一条打卡记录，并按「首次打卡 / 连续 3 天 / 连续 7 天」规则发勋章。
   * 输入：type – 'acupoint'(穴位按揉) | 'relax'(音乐调息) | 'mouth'(嘴巴练习)
   *        durationSec – 本次训练时长（秒）
   * 输出：TcmBadge | null – 本次新获得的勋章 { key, name, emoji, desc }；无新勋章返回 null。
   * 副作用：checkIns 头插（保留最近 200 条）+ badges 更新 + 两者本地持久化
   *         + 打卡/勋章整块镜像云端（user_data 集合，kind='tcm'，换设备可恢复）
   */
  addCheckIn: (type, durationSec) => {
    const record: TcmCheckIn = {
      id: newTcmId(),
      type,
      at: Date.now(),
      durationSec
    }
    const checkIns = [record, ...get().checkIns].slice(0, 200)

    // 计算勋章
    const nextBadges = [...get().badges]
    let latestBadge: string | null = null
    const grant = (key: string) => {
      if (!nextBadges.includes(key)) {
        nextBadges.push(key)
        latestBadge = key
      }
    }
    const firstKeyMap: Record<TcmPracticeType, string> = {
      acupoint: 'first-acupoint',
      relax: 'first-relax',
      mouth: 'first-mouth'
    }
    grant(firstKeyMap[type])
    const streak = calcStreakDays(checkIns)
    if (streak >= 3) grant('streak-3')
    if (streak >= 7) grant('streak-7')

    set({ checkIns, badges: nextBadges, latestBadge })
    storage.set(STORAGE_KEYS.tcmCheckIns, checkIns)
    storage.set(STORAGE_KEYS.tcmBadges, nextBadges)
    saveUserData('tcm', undefined, { checkIns, badges: nextBadges })
    return latestBadge ? TCM_BADGES.find((b) => b.key === latestBadge) ?? null : null
  },

  /** 删：清除「本次新获得勋章」提示（弹窗展示后调用；输入无，输出无） */
  clearLatestBadge: () => set({ latestBadge: null }),

  /**
   * 增：合并云端打卡/勋章进本地（bootstrapSync 启动时换设备恢复调用）。
   * 输入：cloud – { checkIns: TcmCheckIn[], badges: string[] }；输出：无。
   * 副作用：checkIns 按 id 去重取并集 → at 倒序 → 截断 200 条；badges 取并集；
   *         两者写 state + 本地持久化
   */
  mergeCloudTcm: ({ checkIns: cloudCheckIns, badges: cloudBadges }) => {
    if (!cloudCheckIns.length && !cloudBadges.length) return
    const byId = new Map(get().checkIns.map((c) => [c.id, c]))
    for (const c of cloudCheckIns) if (!byId.has(c.id)) byId.set(c.id, c)
    const checkIns = [...byId.values()].sort((a, b) => b.at - a.at).slice(0, 200)
    const badges = [...new Set([...get().badges, ...cloudBadges])]
    set({ checkIns, badges })
    storage.set(STORAGE_KEYS.tcmCheckIns, checkIns)
    storage.set(STORAGE_KEYS.tcmBadges, badges)
  },

  /**
   * 查：从本地存储恢复打卡记录与勋章列表。
   * 输入：无；输出：无（写入 state：checkIns、badges）
   */
  loadLocalData: () => {
    const checkIns = storage.get<TcmCheckIn[]>(STORAGE_KEYS.tcmCheckIns, [])
    const badges = storage.get<string[]>(STORAGE_KEYS.tcmBadges, [])
    set({ checkIns, badges })
  }
}))
