const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const res = await db
      .collection('saved_phrases')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    return { code: 0, message: 'success', data: { phrases: res.data } }
  } catch (err) {
    console.error('[getSavedPhrases] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
