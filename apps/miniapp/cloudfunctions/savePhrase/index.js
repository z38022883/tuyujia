const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { phrase } = event
    if (!phrase || !phrase.sentence) {
      return { code: -1, message: '短语内容不能为空', data: null }
    }
    const res = await db.collection('saved_phrases').add({
      data: {
        _openid: openid,
        sentence: phrase.sentence,
        pictogramIds: phrase.pictogramIds || [],
        usageCount: phrase.usageCount || 0,
        createdAt: phrase.createdAt || db.serverDate(),
        lastUsedAt: phrase.lastUsedAt || db.serverDate()
      }
    })
    return { code: 0, message: 'success', data: { id: res._id } }
  } catch (err) {
    console.error('[savePhrase] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
