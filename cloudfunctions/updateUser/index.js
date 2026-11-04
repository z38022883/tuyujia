// ===== 用户信息云函数：更新本人 users 文档（白名单字段；查无此人自动注册，查 + 增/改）=====
/**
 * 输入 event：{ role?: UserRole }（nickname / avatar 预留同函数；白名单校验，非法值直接报错）
 *   role: '' | 'patient' | 'family'   // 账号角色（'' = 未标注）
 * 输出 data：{
 *   user: {                              // 更新后的 users 集合文档
 *     _id: string                        // 文档 id
 *     _openid: string                    // 用户 openid
 *     nickname: string                   // 昵称
 *     avatar: string                     // 头像 URL
 *     role: UserRole                     // 账号角色
 *     createdAt?: serverDate             // 注册时间
 *   }
 * }
 * 注意：openid 由调用上下文注入，仅允许改本人文档；上线顺序需先于依赖它的前端版本。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// role 合法值白名单（与前端 types/index.ts 的 UserRole 对齐）
const ROLE_VALUES = ['', 'patient', 'family']

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const userCol = db.collection('users')

    // 白名单校验：仅接受 role 字段（nickname / avatar 预留），非法值直接报错
    const patch = {}
    if ('role' in event) {
      if (!ROLE_VALUES.includes(event.role)) {
        return { code: -1, message: '非法的角色值', data: null }
      }
      patch.role = event.role
    }
    if (Object.keys(patch).length === 0) {
      return { code: -1, message: '无可更新字段', data: null }
    }

    // 查（read）：按 openid 查本人文档；查无则自动注册（与 login 注册分支同默认值）——
    // 首检流程（程度页→角色页）可能先于任何 login 到达，这里自愈，避免「用户不存在」死路
    const existing = await userCol.where({ _openid: openid }).get()
    if (existing.data.length === 0) {
      const nickname = '用户' + openid.slice(-6)
      const created = await userCol.add({
        data: {
          _openid: openid,
          nickname,
          avatar: '',
          role: patch.role || '',
          createdAt: db.serverDate()
        }
      })
      return {
        code: 0,
        message: 'success',
        data: { user: { _id: created._id, _openid: openid, nickname, avatar: '', role: patch.role || '' } }
      }
    }

    // 改（update）：仅更新本人文档
    await userCol.where({ _openid: openid }).update({ data: patch })
    const updated = await userCol.where({ _openid: openid }).get()
    return { code: 0, message: 'success', data: { user: updated.data[0] } }
  } catch (err) {
    console.error('[updateUser] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
