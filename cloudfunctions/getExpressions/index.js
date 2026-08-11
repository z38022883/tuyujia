const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const limit = Math.min(event.limit || 50, 200)
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
