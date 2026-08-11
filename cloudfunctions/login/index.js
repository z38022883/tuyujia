const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const userCol = db.collection('users')
    const existing = await userCol.where({ _openid: openid }).get()
    let user
    if (existing.data.length > 0) {
      user = existing.data[0]
    } else {
      const created = await userCol.add({
        data: {
          _openid: openid,
          nickname: '用户' + openid.slice(-6),
          avatar: '',
          createdAt: db.serverDate()
        }
      })
      user = {
        _id: created._id,
        _openid: openid,
        nickname: '用户' + openid.slice(-6),
        avatar: ''
      }
    }
    return { code: 0, message: 'success', data: { openid, user } }
  } catch (err) {
    console.error('[login] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
