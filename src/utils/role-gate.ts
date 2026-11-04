// ===== 角色首检门禁：是否应引导进角色选择页（程度页保存后与首页 onShow 共用同一判断）=====
import { storage, STORAGE_KEYS } from '@/services/storage';
import { normalizeRole } from '@/utils/role-display';
import type { User } from '@/types';

/**
 * 查：是否需要弹角色选择页。输入：无；
 * 输出：true = 本地无角色且未「暂不选择」过。
 * 直接读 storage 缓存（与程度门禁同模式），避免依赖 store 加载时序；
 * 程度页保存后据此直达角色页，避免「闪一下空白首页再跳」的两连跳体验。
 */
export function shouldPromptRole(): boolean {
  const user = storage.get<User | null>(STORAGE_KEYS.user, null);
  return (
    normalizeRole(user?.role) === '' &&
    !storage.get<boolean>(STORAGE_KEYS.rolePromptDismissed, false)
  );
}
