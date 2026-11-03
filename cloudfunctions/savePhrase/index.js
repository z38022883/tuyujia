// ===== 常用语云函数：保存收藏短语（saved_phrases 集合 增 / 改）=====
/**
 * 输入 event：{ phrase: SavedPhrase }，字段：
 *   id?: string              // 前端生成的短语 id；有则按 _id 覆盖（改），无则新增（增）
 *   sentence: string         // 短语文本（必填，为空报错）
 *   pictogramIds?: string[]  // 组成短语的图符 id 列表
 *   usageCount?: number      // 使用次数，默认 0
 *   createdAt?: number       // 创建时间戳（缺省用服务端时间）
 *   lastUsedAt?: number      // 最近使用时间戳（缺省用服务端时间）
 * 输出 data：{ id: string }  // 云端文档 _id（即 phrase.id 或新生成的 _id）
 */
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
