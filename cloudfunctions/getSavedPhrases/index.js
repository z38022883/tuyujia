// ===== 常用语云函数：查询当前用户的收藏短语列表（saved_phrases 集合 查）=====
/**
 * 输入 event：无字段
 * 输出 data：{ phrases: SavedPhrase[] }  // 固定拉取 100 条，按 createdAt 倒序，
 *            仅返回当前 openid 的记录；每条字段同 savePhrase 入参 phrase（另含云端 _id、_openid）
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    // 查（read）：按 openid 过滤，创建时间倒序
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
