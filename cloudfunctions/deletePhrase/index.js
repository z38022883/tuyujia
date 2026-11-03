// ===== 常用语云函数：按 id 删除一条收藏短语（saved_phrases 集合 删）=====
/**
 * 输入 event：{ id: string }  // 短语 id（即云端文档 _id，必填，缺失报错）
 * 输出 data：{ ok: true }     // 删除成功标志
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { id } = event
    if (!id) {
      return { code: -1, message: '缺少短语 id', data: null }
    }
    // 删（delete）：按文档 _id 移除
    await db.collection('saved_phrases').doc(id).remove()
    return { code: 0, message: 'success', data: { ok: true } }
  } catch (err) {
    console.error('[deletePhrase] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
