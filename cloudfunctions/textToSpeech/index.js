// 朗读云函数 textToSpeech
// 职责：接收文本 → 调用腾讯云语音合成（基础语音合成 TextToVoice, tts v20190823）→ 返回 mp3 base64。
//
// 必填环境变量（云开发控制台 → 云函数 → 配置）：
//   TENCENT_SECRET_ID    腾讯云 API 密钥 SecretId
//   TENCENT_SECRET_KEY   腾讯云 API 密钥 SecretKey
// 可选环境变量：
//   TTS_REGION           默认 ap-guangzhou
//   TTS_VOICE_FEMALE     女声音色 ID（默认 0，标准引擎）
//   TTS_VOICE_MALE       男声音色 ID（默认 1，标准引擎）
//   TTS_ENGINE           引擎类型（standard/emotional/vitality…，留空用服务端默认）
//
// 注意：
//   - 基础语音合成单次文本上限 150 字符，超长自动截断并返回 truncated=true
//   - 若腾讯云返回音色/语速等参数错误，错误信息原样带回给客户端，便于快速定位调整
//   - 部署后建议把本函数超时时间调至 10s+（默认 3s 偏紧）

const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const SERVICE = 'tts'
const HOST = 'tts.tencentcloudapi.com'
const VERSION = '2019-08-23'
const ACTION = 'TextToVoice'
const REGION = (process.env.TTS_REGION || 'ap-guangzhou').trim()
const MAX_TEXT_LENGTH = 150
const UPSTREAM_TIMEOUT_MS = 10000

// 标准引擎音色：0 = 标准女声，1 = 标准男声；可用环境变量覆盖
const VOICE_FEMALE = Number(process.env.TTS_VOICE_FEMALE || 0)
const VOICE_MALE = Number(process.env.TTS_VOICE_MALE || 1)
const ENGINE = (process.env.TTS_ENGINE || '').trim()

/** 语速换算：UI 0.5x~2x → 接口语速 [-10,10]，0 为正常语速 */
function rateToSpeed(rate) {
  const r = Math.min(Math.max(Number(rate) || 1, 0.5), 2)
  const speed = Math.round((r - 1) * 10)
  return Math.max(-10, Math.min(10, speed))
}

const sha256hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')
const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg, 'utf8').digest()

/** 腾讯云 API 3.0 TC3-HMAC-SHA256 签名 */
function tc3Sign(secretId, secretKey, payload, timestamp) {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const contentType = 'application/json; charset=utf-8'
  const canonicalHeaders = `content-type:${contentType}\nhost:${HOST}\n`
  const signedHeaders = 'content-type;host'
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    sha256hex(payload)
  ].join('\n')
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    `${date}/${SERVICE}/tc3_request`,
    sha256hex(canonicalRequest)
  ].join('\n')

  const secretDate = hmac(`TC3${secretKey}`, date)
  const secretService = hmac(secretDate, SERVICE)
  const secretSigning = hmac(secretService, 'tc3_request')
  const signature = hmac(secretSigning, stringToSign).toString('hex')

  return {
    authorization:
      `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${SERVICE}/tc3_request, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    contentType
  }
}

function postJson(headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const req = https.request(
      {
        hostname: HOST,
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': headers.contentType,
          'Content-Length': Buffer.byteLength(payload),
          Host: HOST,
          Authorization: headers.authorization,
          'X-TC-Action': ACTION,
          'X-TC-Version': VERSION,
          'X-TC-Timestamp': String(headers.timestamp),
          'X-TC-Region': REGION
        },
        timeout: UPSTREAM_TIMEOUT_MS
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('timeout', () => req.destroy(new Error('Tencent TTS upstream timeout')))
    req.on('error', (err) => reject(err))
    req.write(payload)
    req.end()
  })
}

/** 合成单段文本，返回 mp3 base64 */
async function synthesize(secretId, secretKey, text, voiceType, speed) {
  const timestamp = Math.floor(Date.now() / 1000)
  const params = {
    Text: text,
    SessionId: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    VoiceType: voiceType,
    Codec: 'mp3',
    SampleRate: 16000,
    Speed: speed
  }
  if (ENGINE) params.EngineModelType = ENGINE

  const payload = JSON.stringify(params)
  const { authorization, contentType } = tc3Sign(secretId, secretKey, payload, timestamp)
  const res = await postJson(
    { authorization, contentType, timestamp },
    params
  )

  let parsed
  try {
    parsed = JSON.parse(res.body)
  } catch (err) {
    throw new Error(`Tencent TTS invalid response (${res.status}): ${res.body.slice(0, 200)}`)
  }

  const resp = parsed.Response || {}
  if (resp.Error) {
    throw new Error(`Tencent TTS error [${resp.Error.Code}]: ${resp.Error.Message}`)
  }
  if (!resp.Audio) {
    throw new Error('Tencent TTS returned empty audio')
  }
  return resp.Audio
}

exports.main = async (event) => {
  try {
    const secretId = (process.env.TENCENT_SECRET_ID || '').trim()
    const secretKey = (process.env.TENCENT_SECRET_KEY || '').trim()
    if (!secretId || !secretKey) {
      return { code: -1, message: '云函数未配置 TENCENT_SECRET_ID / TENCENT_SECRET_KEY 环境变量', data: null }
    }

    const text = String(event.text || '').trim()
    if (!text) {
      return { code: -1, message: 'text 不能为空', data: null }
    }
    const truncated = text.length > MAX_TEXT_LENGTH
    const finalText = truncated ? text.slice(0, MAX_TEXT_LENGTH) : text

    const voiceName = String(event.voiceName || 'female')
    const voiceType = voiceName === 'male' ? VOICE_MALE : VOICE_FEMALE
    const speed = rateToSpeed(Number(event.rate) || 1)

    const audioBase64 = await synthesize(secretId, secretKey, finalText, voiceType, speed)
    return {
      code: 0,
      message: 'success',
      data: { audioBase64, codec: 'mp3', truncated }
    }
  } catch (err) {
    console.error('[textToSpeech] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
