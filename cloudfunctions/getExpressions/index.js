// ===== 表达历史云函数：查询当前用户的表达记录列表（expressions 集合 查）=====
/**
 * 输入 event：{ limit?: number }  // 拉取条数，默认 50，上限 200
 * 输出 data：{ expressions: Expression[] }  // 按 createdAt 倒序，仅返回当前 openid 的记录，
 *           每条字段同 saveExpression 入参 expression（另含云端 _id、_openid）
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const limit = Math.min(event.limit || 50, 200)
    // 查（read）：按 openid 过滤，创建时间倒序
    const res = await db
      .collection('expressions')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    return { code: 0, message: 'success', data: { expressions: res.data } }
  } catch (err) {
    console.error('[getExpressions] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
