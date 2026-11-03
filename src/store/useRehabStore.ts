// ===== 康复训练状态管理（框架 v0.1）=====
// 训练等级来源：患者程度档案（轻/中/重自选，v0.2 方案）；
// 无档案时回退本地手动值；后续接入分级评估后由 AssessmentResult 覆盖档案。

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/services/storage'
import { useProfileStore } from '@/store/useProfileStore'
import type {
  RehabDimension,
  RehabLevel,
  RehabSession,
  RehabTaskRecord
} from '@/types/rehab'
import { buildRehabTasks } from '@/data/rehab'

let rehabIdCounter = 0
function newRehabId(prefix: string): string {
  rehabIdCounter += 1
  return `${prefix}_${Date.now()}_${rehabIdCounter}`
}

export interface StartSessionOptions {
  /** 维度权重（短板维度更高）；缺省均匀出题 */
  dimensionWeights?: Partial<Record<RehabDimension, number>>
}

interface RehabState {
  level: RehabLevel
  /** 已完成的训练（历史，最多保留 50 条） */
  sessions: RehabSession[]
  /** 进行中（或刚完成）的训练 */
  activeSession: RehabSession | null

  setLevel: (level: RehabLevel) => void
  startSession: (opts?: StartSessionOptions) => RehabSession
  recordTaskResult: (record: RehabTaskRecord) => void
  finishSession: () => void
  abandonSession: () => void
  loadLocalData: () => void
}

export const useRehabStore = create<RehabState>((set, get) => ({
  level: 'moderate',
  sessions: [],
  activeSession: null,

  /**
   * 增/改：设置训练等级（无档案时的回退值；有程度档案时以档案为准）。
   * 输入：level – 'severe' | 'moderate' | 'mild'；输出：无。
   * 副作用：写入 state.level + 本地持久化（rehabLevel key）
   */
  setLevel: (level) => {
    set({ level })
    // 保留旧 key 作为无档案时的回退（档案存在时以档案为准）
    storage.set(STORAGE_KEYS.rehabLevel, level)
  },

  /**
   * 增：开始一次训练会话（按等级 + 可选维度权重从题库出题）。
   * 输入 opts?: { dimensionWeights?: Partial<Record<RehabDimension, number>> }
   *        – 四维权重（短板维度更高），缺省均匀出题
   * 输出：RehabSession – 新会话 { id, level, startedAt, durationSec=0, totalTasks,
   *        completedTasks=0, tasks（题目快照）, taskRecords=[] }。
   * 副作用：写入 activeSession + 本地持久化
   */
  startSession: (opts) => {
    const level = get().level
    const tasks = buildRehabTasks(level, {
      dimensionWeights: opts?.dimensionWeights
    })
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

  /**
   * 增：把单题作答记录追加到进行中的会话。
   * 输入 record: RehabTaskRecord { taskId, taskType, dimension,
   *        correct?, rating? (1-5 星级题), answer? (作答摘要), durationSec }
   * 输出：无。副作用：更新 activeSession（taskRecords 追加、completedTasks+1）+ 本地持久化
   */
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

  /**
   * 改：结束当前会话（补 finishedAt、累计 durationSec）并归档进历史。
   * 输入：无；输出：无。
   * 副作用：activeSession 落为已完成状态；sessions 头插（保留最近 50 条）+ 本地持久化
   */
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

  /**
   * 删：放弃进行中的会话（不进历史）。
   * 输入：无；输出：无。副作用：activeSession 置空 + 移除本地持久化
   */
  abandonSession: () => {
    set({ activeSession: null })
    storage.remove(STORAGE_KEYS.rehabActiveSession)
  },

  /**
   * 查：从本地存储恢复等级 / 历史会话 / 进行中会话。
   * 输入：无；输出：无（写入 state：level、sessions、activeSession）。
   * 等级来源：程度档案优先，无档案回退本地手动值
   */
  loadLocalData: () => {
    // 程度档案（自选 轻/中/重）是等级来源；无档案时回退本地手动值
    const profile = useProfileStore.getState().profile
    const fallback = storage.get<RehabLevel>(STORAGE_KEYS.rehabLevel, 'moderate')
    const level = profile ? profile.severity : fallback
    const sessions = storage.get<RehabSession[]>(STORAGE_KEYS.rehabSessions, [])
    const activeSession = storage.get<RehabSession | null>(
      STORAGE_KEYS.rehabActiveSession,
      null
    )
    set({ level, sessions, activeSession })
  }
}))
