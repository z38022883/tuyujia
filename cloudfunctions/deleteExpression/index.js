const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { id } = event
    if (!id) {
      return { code: -1, message: '缺少表达 id', data: null }
    }
    await db.collection('expressions').doc(id).remove()
    return { code: 0, message: 'success', data: { ok: true } }
  } catch (err) {
    console.error('[deleteExpression] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
