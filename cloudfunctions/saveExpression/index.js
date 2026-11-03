// ===== 表达历史云函数：保存一次表达记录（expressions 集合 增 / 改）=====
/**
 * 输入 event：{ expression: Expression }，字段：
 *   id?: string              // 前端生成的记录 id；有则按 _id 覆盖（改），无则新增（增）
 *   sessionId?: string       // 会话 id
 *   direction?: 'express' | 'receive'  // 表达/接收模式，默认 'express'
 *   pictogramIds?: string[]  // 所选图符 id 列表
 *   pictogramLabels?: string[]  // 所选图符中文标签列表
 *   candidateSentences?: string[]  // AI 候选句列表
 *   selectedSentence: string // 最终选中的句子（必填，为空报错）
 *   inputText?: string       // 接收模式原始输入文本
 *   createdAt?: number       // 创建时间戳（缺省用服务端时间）
 *   isFavorite?: boolean     // 是否收藏，默认 false
 * 输出 data：{ id: string }  // 云端文档 _id（即 expression.id 或新生成的 _id）
 */
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
