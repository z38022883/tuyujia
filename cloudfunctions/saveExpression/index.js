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
    const res = await db.collection('expressions').add({
      data: {
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
    })
    return { code: 0, message: 'success', data: { id: res._id } }
  } catch (err) {
    console.error('[saveExpression] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
