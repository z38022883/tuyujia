const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { expression } = event
    if (!expression || !expression.selectedSentence) {
      return { code: -1, message: '表达内容不能为空', data: null }
    }

    const data = {
      _openid: openid,
      sessionId: expression.sessionId,
      direction: expression.direction || 'express',
      pictogramIds: expression.pictogramIds || [],
      pictogramLabels: expression.pictogramLabels || [],
      candidateSentences: expression.candidateSentences || [],
      selectedSentence: expression.selectedSentence,
      inputText: expression.inputText || '',
      createdAt: expression.createdAt || db.serverDate(),
      isFavorite: expression.isFavorite || false
    }

    // 优先用前端生成的 id 作为云端文档 _id（doc().set() 不存在则创建、存在则覆盖），
    // 保证本地删除/查询与云端文档一一对应，避免 add() 另生成 _id 导致云端孤儿数据。
    if (expression.id) {
      await db.collection('expressions').doc(expression.id).set({ data })
      return { code: 0, message: 'success', data: { id: expression.id } }
    }

    const res = await db.collection('expressions').add({ data })
    return { code: 0, message: 'success', data: { id: res._id } }
  } catch (err) {
    console.error('[saveExpression] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
