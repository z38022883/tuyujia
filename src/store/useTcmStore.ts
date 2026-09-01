// ===== 中医辅助训练状态管理 =====
// 打卡记录、连续天数、虚拟勋章，本地持久化（与康复训练 store 同一模式）

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/services/storage'
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

/** 根据打卡记录计算连续天数（含今天） */
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
  loadLocalData: () => void
}

export const useTcmStore = create<TcmState>((set, get) => ({
  checkIns: [],
  badges: [],
  latestBadge: null,

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
    return latestBadge ? TCM_BADGES.find((b) => b.key === latestBadge) ?? null : null
  },

  clearLatestBadge: () => set({ latestBadge: null }),

  loadLocalData: () => {
    const checkIns = storage.get<TcmCheckIn[]>(STORAGE_KEYS.tcmCheckIns, [])
    const badges = storage.get<string[]>(STORAGE_KEYS.tcmBadges, [])
    set({ checkIns, badges })
  }
}))
