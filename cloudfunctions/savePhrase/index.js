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

    const data = {
      _openid: openid,
      sentence: phrase.sentence,
      pictogramIds: phrase.pictogramIds || [],
      usageCount: phrase.usageCount || 0,
      createdAt: phrase.createdAt || db.serverDate(),
      lastUsedAt: phrase.lastUsedAt || db.serverDate()
    }

    // 优先用前端生成的 id 作为云端文档 _id（doc().set() 不存在则创建、存在则覆盖），
    // 保证本地删除/查询与云端文档一一对应，避免 add() 另生成 _id 导致云端孤儿数据。
    if (phrase.id) {
      await db.collection('saved_phrases').doc(phrase.id).set({ data })
      return { code: 0, message: 'success', data: { id: phrase.id } }
    }

    const res = await db.collection('saved_phrases').add({ data })
    return { code: 0, message: 'success', data: { id: res._id } }
  } catch (err) {
    console.error('[savePhrase] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
