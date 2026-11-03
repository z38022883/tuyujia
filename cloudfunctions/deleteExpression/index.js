// ===== 表达历史云函数：按 id 删除一条表达记录（expressions 集合 删）=====
/**
 * 输入 event：{ id: string }  // 表达记录 id（即云端文档 _id，必填，缺失报错）
 * 输出 data：{ ok: true }     // 删除成功标志
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { id } = event
    if (!id) {
      return { code: -1, message: '缺少表达 id', data: null }
    }
    // 删（delete）：按文档 _id 移除
    await db.collection('expressions').doc(id).remove()
    return { code: 0, message: 'success', data: { ok: true } }
  } catch (err) {
    console.error('[deleteExpression] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
