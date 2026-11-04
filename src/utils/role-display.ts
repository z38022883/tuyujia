// ===== 账号角色展示工具：角色 ↔ 文案映射与缺省兜底 =====
import type { UserRole } from '@/types'

/** 角色中文文案（'' 未标注不在映射内，展示层自行决定是否隐藏） */
export const USER_ROLE_LABELS: Record<Exclude<UserRole, ''>, string> = {
  patient: '患者',
  family: '家属'
}

/**
 * 查：角色中文文案。输入 role（UserRole）；输出「患者」/「家属」，未标注返回 ''。
 */
export function roleLabel(role: UserRole): string {
  return role === 'patient' || role === 'family'
    ? USER_ROLE_LABELS[role]
    : ''
}

/**
 * 查：角色兜底。输入任意值（存量缓存/云文档可能缺 role 或为脏值）；输出合法 UserRole，
 * 非 patient/family 一律归一为 ''（未标注），保证展示与门禁判断不受脏数据影响。
 */
export function normalizeRole(role: unknown): UserRole {
  return role === 'patient' || role === 'family' ? role : ''
}
