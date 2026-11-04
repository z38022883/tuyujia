// ===== 用户账号状态（user 缓存 + 账号角色；云端 users 文档为唯一事实源）=====
// 复用现有 tuyujia_user 缓存 key（User 对象多一个 role 字段，旧缓存缺 role 按 '' 兜底）。
// mine 页等各页不再各自管 user，统一读写本 store（登录刷新仍由 mine 页调 login 云函数）。

import Taro from '@tarojs/taro'
import { create } from 'zustand'
import { callFunction } from '@/services/cloud'
import { storage, STORAGE_KEYS } from '@/services/storage'
import { normalizeRole } from '@/utils/role-display'
import type { User, UserRole } from '@/types'

interface UserState {
  /** null = 未登录/未拉取 */
  user: User | null
  /** 查：从本地缓存恢复 user（缺 role 按 '' 兜底） */
  load: () => void
  /**
   * 增：调 login 云函数注册/刷新 user（云端查不到则自动注册新文档）。
   * 输出：Promise<boolean> – 是否拿到 user（H5 预览无云函数恒 false）。
   */
  login: () => Promise<boolean>
  /** 增/改：写入 user（本地缓存 + state），login 云函数返回后调用 */
  setUser: (user: User) => void
  /**
   * 改：设置账号角色（乐观更新本地 → 云端 updateUser 同步；失败回滚本地并 toast）。
   * 输出：Promise<boolean> – 云端是否同步成功（H5 预览无云函数，仅本地生效视为成功）
   */
  setRole: (role: UserRole) => Promise<boolean>
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,

  /**
   * 查：从本地存储恢复 user。输入：无；输出：无（写入 state：user = User | null）。
   * 旧缓存缺 role / 脏值统一 normalizeRole 兜底为 ''。
   */
  load: () => {
    const cached = storage.get<User | null>(STORAGE_KEYS.user, null)
    if (!cached) return
    set({ user: { ...cached, role: normalizeRole(cached.role) } })
  },

  /**
   * 增：调 login 云函数注册/刷新 user。输入：无；输出是否拿到 user。
   * 副作用：成功则写本地缓存 + state（role 缺省兜底 ''）；失败仅打日志不抛错。
   */
  login: async () => {
    try {
      const res = await callFunction<{ openid: string; user: User }>('login')
      if (!res?.user) return false
      const user: User = { ...res.user, role: normalizeRole(res.user.role) }
      set({ user })
      storage.set(STORAGE_KEYS.user, user)
      return true
    } catch (err) {
      console.error('[useUserStore] login failed:', err)
      return false
    }
  },

  /**
   * 增/改：写入 user（login 云函数成功后调用）。输入 user（含 role 的用户文档）；
   * 输出：无。副作用：写本地缓存 + state（role 缺省兜底 ''）。
   */
  setUser: (user) => {
    const next: User = { ...user, role: normalizeRole(user.role) }
    set({ user: next })
    storage.set(STORAGE_KEYS.user, next)
  },

  /**
   * 改：设置账号角色。输入 role – '' | 'patient' | 'family'；输出云端是否成功。
   * 副作用：乐观写本地 → callFunction('updateUser') → 成功用云端文档覆盖；
   * 失败回滚本地并 toast（updateUser 未部署时的可接受降级，仍应先发云函数）。
   * 本地尚无 user（新设备未走过 login）时不放弃：云端成功用返回文档落库，
   * H5 预览（无云函数）落一条最小本地记录，保证角色态可用。
   */
  setRole: async (role) => {
    let prev = get().user
    if (!prev) {
      // 本地无 user（新设备未走过登录）：先 login 注册云端文档，
      // 否则 updateUser 查无此人会报「用户不存在」
      await get().login()
      prev = get().user
    }
    if (prev) {
      const next: User = { ...prev, role }
      set({ user: next })
      storage.set(STORAGE_KEYS.user, next)
    }
    try {
      const res = await callFunction<{ user: User }>('updateUser', { role })
      if (res?.user) {
        // 云端为事实源：用更新后的文档覆盖本地（role 缺省兜底，防旧云函数）
        const synced: User = { ...res.user, role: normalizeRole(res.user.role) }
        set({ user: synced })
        storage.set(STORAGE_KEYS.user, synced)
      } else if (!prev) {
        // H5 预览模式：无云函数且本地无 user，落最小记录（openid/nickname 空待登录补全）
        const local: User = { openid: '', nickname: '', avatar: '', role }
        set({ user: local })
        storage.set(STORAGE_KEYS.user, local)
      }
      return true
    } catch (err) {
      console.error('[useUserStore] setRole failed:', err)
      if (prev) {
        set({ user: prev })
        storage.set(STORAGE_KEYS.user, prev)
      }
      // 直出真实原因（云函数业务错误均为中文文案；平台类错误截断展示，完整信息看 console）
      const msg =
        err instanceof Error && err.message
          ? err.message.slice(0, 30)
          : '云端同步失败'
      Taro.showToast({ title: msg, icon: 'none', duration: 3000 })
      return false
    }
  }
}))
