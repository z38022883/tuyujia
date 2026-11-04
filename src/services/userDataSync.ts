// ===== 用户数据云同步：康复训练/评估记录/中医打卡/程度档案的账号级镜像 =====
// 与收藏短语/表达历史同一策略：变更时 fire-and-forget 上云（云端为准 + 本地缓存），
// 换设备/重装后由 bootstrapSync（启动时）从云端拉回合并，见 services/bootstrapSync.ts。
// 本文件不 import 任何 store，避免与各 store 的循环依赖。

import { callFunction } from '@/services/cloud'

/** user_data 集合文档的 kind 类别（与 cloudfunctions/syncUserData 白名单一致） */
export type UserDataKind =
  | 'rehab_session' // 康复单次训练（itemId = 会话 id，每条一文档）
  | 'assessment_list' // 评估记录整块
  | 'tcm' // 中医打卡 + 勋章整块
  | 'profile' // 患者程度档案

/**
 * 增/改：把一份数据镜像到云端（fire-and-forget，失败仅打日志，不阻塞本地操作）。
 * 输入：kind – 数据类别（见 UserDataKind）；itemId – 子项 id（整块存类别传 undefined，云端落 'main'）；
 *       data – 存档内容（任意可序列化值）。
 * 输出：无。副作用：调用 syncUserData 云函数写 user_data 集合。
 */
export function saveUserData(kind: UserDataKind, itemId: string | undefined, data: unknown): void {
  callFunction('syncUserData', { action: 'save', kind, itemId, data }).catch((err) =>
    console.error('[UserDataSync] save failed:', kind, err)
  )
}
