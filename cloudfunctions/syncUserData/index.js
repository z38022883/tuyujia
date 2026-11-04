// ===== 用户数据同步云函数：康复训练/评估记录/中医打卡/程度档案的账号级存取（user_data 集合 增/改/查）=====
/**
 * 输入 event：{ action: 'save' | 'get', kind?, itemId?, data? }，字段：
 *   action: 'save'           // 写（幂等 upsert）
 *     kind: string           // 数据类别：'rehab_session'(康复单次训练，itemId=会话id)
 *                            //   | 'assessment_list'(评估记录整块) | 'tcm'(打卡+勋章整块)
 *                            //   | 'profile'(程度档案)，四类白名单校验
 *     itemId?: string        // 子项 id；缺省落 'main'（整块存类别）
 *     data: any              // 存档内容（整块 JSON，文档 data 字段）
 *   action: 'get'            // 读当前 openid 全部存档（无需 kind/itemId/data）
 * 输出 data：
 *   save → { id: string }    // 云端文档 _id（`${openid}_${kind}_${itemId|main}`）
 *   get  → { docs: Array<{ kind, itemId, data, updatedAt }> }
 * 文档 _id 含 openid，天然按账号隔离且 doc().set() 一次调用完成 upsert；
 * 康复训练按条拆文档（单条含整份题目快照，整块存可能逼近文档 512KB 限制），其余三类各一文档。
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const KINDS = ['rehab_session', 'assessment_list', 'tcm', 'profile']

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const { action, kind, itemId, data } = event

    if (action === 'save') {
      if (!KINDS.includes(kind) || data === undefined || data === null) {
        return { code: -1, message: 'kind 或 data 不合法', data: null }
      }
      const id = `${openid}_${kind}_${itemId || 'main'}`
      await db.collection('user_data').doc(id).set({
        data: { _openid: openid, kind, itemId: itemId || 'main', data, updatedAt: Date.now() }
      })
      return { code: 0, message: 'success', data: { id } }
    }

    if (action === 'get') {
      // 单用户文档数上限 53（康复 50 条 + 整块 3 条），limit(100) 一次拉全
      const res = await db
        .collection('user_data')
        .where({ _openid: openid })
        .limit(100)
        .get()
      const docs = res.data.map((d) => ({
        kind: d.kind,
        itemId: d.itemId,
        data: d.data,
        updatedAt: d.updatedAt
      }))
      return { code: 0, message: 'success', data: { docs } }
    }

    return { code: -1, message: '未知 action', data: null }
  } catch (err) {
    console.error('[syncUserData] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
