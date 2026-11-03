// ===== 云函数调用服务：前端调用云端数据接口（增删查改）的统一入口 =====
import Taro from '@tarojs/taro'

const isWeapp = process.env.TARO_ENV === 'weapp'

/**
 * 调用云函数并解包统一返回格式。
 * 输入：
 *   name – 云函数名（如 'saveExpression' / 'getSavedPhrases'）
 *   data – 传给云函数的 event 参数（字段见各云函数头注释）
 * 输出：Promise<T> – 云函数返回的 data 字段；非微信端直接返回 undefined；
 *       云端 code !== 0 时抛 Error(message)
 */
export async function callFunction<T = any>(
  name: string,
  data?: Record<string, any>
): Promise<T> {
  if (!isWeapp) {
    // H5 预览模式下无云函数，静默跳过（本地 store 已做持久化）
    console.debug(`[Cloud] skip ${name} in non-weapp env`)
    return undefined as unknown as T
  }
  const res = await Taro.cloud.callFunction({ name, data })
  const result = res.result as { code: number; message: string; data: T }
  if (result.code !== 0) {
    console.error(`[Cloud] ${name} failed:`, result.message)
    throw new Error(result.message || '请求失败')
  }
  return result.data
}

/** 获取云数据库实例（仅微信端；输入无，输出 db 实例或非微信端 null），供前端直接做集合级增删查改 */
export function getDatabase() {
  if (!isWeapp) {
    return null
  }
  return Taro.cloud.database()
}
