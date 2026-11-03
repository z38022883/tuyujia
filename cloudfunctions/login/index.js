// ===== 登录云函数：按 openid 查用户，不存在则注册（users 集合 查 + 增）=====
/**
 * 输入 event：无必填字段（openid 由微信调用上下文自动注入，前端传参无效）
 * 输出 data：{
 *   openid: string                        // 当前用户 openid
 *   user: {                               // users 集合文档（查到）或注册后的新用户（增）
 *     _id: string                         // 文档 id
 *     _openid: string                     // 用户 openid
 *     nickname: string                    // 昵称（新用户默认「用户+openid 后 6 位」）
 *     avatar: string                      // 头像 URL（默认空串）
 *     createdAt?: serverDate              // 注册时间（仅查到的文档带）
 *   }
 * }
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const userCol = db.collection('users')
    // 查（read）：按 openid 查现有用户
    const existing = await userCol.where({ _openid: openid }).get()
    let user
    if (existing.data.length > 0) {
      user = existing.data[0]
    } else {
      // 增（create）：首次登录自动注册默认用户
      const created = await userCol.add({
        data: {
          _openid: openid,
          nickname: '用户' + openid.slice(-6),
          avatar: '',
          createdAt: db.serverDate()
        }
      })
      user = {
        _id: created._id,
        _openid: openid,
        nickname: '用户' + openid.slice(-6),
        avatar: ''
      }
    }
    return { code: 0, message: 'success', data: { openid, user } }
  } catch (err) {
    console.error('[login] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
