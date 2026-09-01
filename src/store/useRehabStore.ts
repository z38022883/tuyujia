// ===== 康复训练状态管理（框架 v0.1）=====
// 等级手动选择（后续接入分级模块后改为读取 AssessmentResult）；
// 训练会话本地持久化，云端同步待 Phase 2。

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/services/storage'
import type { RehabLevel, RehabSession, RehabTaskRecord } from '@/types/rehab'
import { buildRehabTasks } from '@/data/rehab'

let rehabIdCounter = 0
function newRehabId(prefix: string): string {
  rehabIdCounter += 1
  return `${prefix}_${Date.now()}_${rehabIdCounter}`
}

interface RehabState {
  level: RehabLevel
  /** 已完成的训练（历史，最多保留 50 条） */
  sessions: RehabSession[]
  /** 进行中（或刚完成）的训练 */
  activeSession: RehabSession | null

  setLevel: (level: RehabLevel) => void
  startSession: () => RehabSession
  recordTaskResult: (record: RehabTaskRecord) => void
  finishSession: () => void
  abandonSession: () => void
  loadLocalData: () => void
}

export const useRehabStore = create<RehabState>((set, get) => ({
  level: 'moderate',
  sessions: [],
  activeSession: null,

  setLevel: (level) => {
    set({ level })
    storage.set(STORAGE_KEYS.rehabLevel, level)
  },

  startSession: () => {
    const level = get().level
    const tasks = buildRehabTasks(level)
    const session: RehabSession = {
      id: newRehabId('rehab'),
      level,
      startedAt: Date.now(),
      durationSec: 0,
      totalTasks: tasks.length,
      completedTasks: 0,
      tasks,
      taskRecords: []
    }
    set({ activeSession: session })
    storage.set(STORAGE_KEYS.rehabActiveSession, session)
    return session
  },

  recordTaskResult: (record) => {
    const active = get().activeSession
    if (!active) return
    const next: RehabSession = {
      ...active,
      taskRecords: [...active.taskRecords, record],
      completedTasks: active.completedTasks + 1
    }
    set({ activeSession: next })
    storage.set(STORAGE_KEYS.rehabActiveSession, next)
  },

  finishSession: () => {
    const active = get().activeSession
    if (!active) return
    const finished: RehabSession = {
      ...active,
      finishedAt: Date.now(),
      durationSec: Math.max(1, Math.round((Date.now() - active.startedAt) / 1000))
    }
    const nextSessions = [finished, ...get().sessions].slice(0, 50)
    set({ activeSession: finished, sessions: nextSessions })
    storage.set(STORAGE_KEYS.rehabActiveSession, finished)
    storage.set(STORAGE_KEYS.rehabSessions, nextSessions)
  },

  abandonSession: () => {
    set({ activeSession: null })
    storage.remove(STORAGE_KEYS.rehabActiveSession)
  },

  loadLocalData: () => {
    const level = storage.get<RehabLevel>(STORAGE_KEYS.rehabLevel, 'moderate')
    const sessions = storage.get<RehabSession[]>(STORAGE_KEYS.rehabSessions, [])
    const activeSession = storage.get<RehabSession | null>(
      STORAGE_KEYS.rehabActiveSession,
      null
    )
    set({ level, sessions, activeSession })
  }
}))
