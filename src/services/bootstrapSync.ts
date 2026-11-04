// ===== 启动时云端数据恢复：换设备/重装后从 user_data 云集合拉回四类存档 =====
// 时序：app.tsx 先同步 load 各 store 本地缓存，再异步调 bootstrapCloudSync（不阻塞首屏）。
// 合并策略与收藏/表达历史的页面级拉取一致：本地优先、云端补差集；档案按 updatedAt 新者胜。

import { callFunction } from '@/services/cloud'
import { useUserStore } from '@/store/useUserStore'
import { useRehabStore } from '@/store/useRehabStore'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { useTcmStore } from '@/store/useTcmStore'
import { useProfileStore } from '@/store/useProfileStore'
import type { RehabSession } from '@/types/rehab'
import type { AssessmentResult } from '@/types/assessment'
import type { TcmCheckIn } from '@/types/tcm'
import type { PatientProfile } from '@/types/profile'

/** user_data 云文档结构（见 cloudfunctions/syncUserData） */
interface UserDataDoc {
  kind: string
  itemId: string
  data: any
  updatedAt?: number
}

/**
 * 查/增：启动时静默恢复账号数据。
 * 流程：login（恢复 nickname/role 等账号资料，失败继续）→ syncUserData get 拉全部存档
 * → 按 kind 分发到各 store 的 mergeCloudXxx 合并回填。
 * 输入：无；输出：Promise<void>（整体不抛错，失败仅打日志，不影响本地已有数据）。
 * 非微信端 callFunction 返回 undefined，直接返回（H5 预览无云端）。
 */
export async function bootstrapCloudSync(): Promise<void> {
  try {
    await useUserStore.getState().login()
  } catch (err) {
    console.error('[BootstrapSync] login failed:', err)
  }

  try {
    const res = await callFunction<{ docs: UserDataDoc[] }>('syncUserData', {
      action: 'get'
    })
    if (!res) return // H5 预览模式跳过
    const docs = res.docs || []

    const cloudSessions = docs
      .filter((d) => d.kind === 'rehab_session')
      .map((d) => d.data as RehabSession)
      .filter(Boolean)
    useRehabStore.getState().mergeCloudSessions(cloudSessions)

    const cloudAssessments = docs
      .filter((d) => d.kind === 'assessment_list')
      .flatMap((d) => (Array.isArray(d.data) ? (d.data as AssessmentResult[]) : []))
      .filter(Boolean)
    useAssessmentStore.getState().mergeCloudAssessments(cloudAssessments)

    const tcmDoc = docs.find((d) => d.kind === 'tcm')
    if (tcmDoc && tcmDoc.data) {
      useTcmStore.getState().mergeCloudTcm({
        checkIns: (tcmDoc.data.checkIns || []) as TcmCheckIn[],
        badges: tcmDoc.data.badges || []
      })
    }

    const profileDoc = docs.find((d) => d.kind === 'profile')
    if (profileDoc && profileDoc.data) {
      useProfileStore.getState().mergeCloudProfile(profileDoc.data as PatientProfile)
    }
  } catch (err) {
    console.error('[BootstrapSync] pull failed:', err)
  }
}
