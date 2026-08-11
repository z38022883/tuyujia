const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { id } = event
    if (!id) {
      return { code: -1, message: '缺少短语 id', data: null }
    }
    await db.collection('saved_phrases').doc(id).remove()
    return { code: 0, message: 'success', data: { ok: true } }
  } catch (err) {
    console.error('[deletePhrase] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
