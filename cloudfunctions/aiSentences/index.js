// 云端 AI 组句云函数（迁移自旧仓库 src/server/ai/openai-compatible.ts）
// 入参：event.request = NLGRequest { pictogramLabels, context?, candidateCount }
// 出参：{ code, message, data: NLGResponse { candidates, provider, isOfflineFallback } }
//
// 依赖环境变量（在云开发控制台 / 微信开发者工具配置）：
//   AI_API_KEY  必填
//   AI_BASE_URL 可选，默认 https://api.openai.com/v1
//   AI_MODEL    可选，默认 gpt-4o-mini
//
// 注意：默认云函数超时 3s 太短，需将该函数超时调到 ~20s。

const cloud = require('wx-server-sdk')
const https = require('https')
const fs = require('fs')
const path = require('path')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const UPSTREAM_TIMEOUT_MS = 15000
const MAX_VOCAB_CHARS = 1500

function getConfig() {
  const apiKey = (process.env.AI_API_KEY || '').trim()
  if (!apiKey) return null
  const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = (process.env.AI_MODEL || 'gpt-4o-mini').trim()
  return { apiKey, baseUrl, model }
}

function postJson(url, body, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = JSON.stringify(body)
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers
        },
        timeout: timeoutMs
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }
    )
    req.on('timeout', () => req.destroy(new Error(`AI upstream timeout after ${timeoutMs / 1000}s`)))
    req.on('error', (err) => reject(err))
    req.write(payload)
    req.end()
  })
}

// 图库词汇提示：读取随函数部署的 pictograms.json，按 usageCount 排序、去重、≤1500 字。
function getPictogramVocabularyHint(limit = 200) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'pictograms.json'), 'utf8')
    const pictograms = JSON.parse(raw)
    const sorted = [...pictograms]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit)

    const seen = new Set()
    const parts = []
    let total = 0
    for (const p of sorted) {
      const label = ((p.labels && p.labels.zh && p.labels.zh[0]) || '').trim()
      if (!label || seen.has(label)) continue
      if (total + label.length + 1 > MAX_VOCAB_CHARS) break
      seen.add(label)
      parts.push(label)
      total += label.length + 1
    }
    return parts.join('、')
  } catch (err) {
    console.error('[aiSentences] vocab hint failed:', err)
    return ''
  }
}

function buildSystemPrompt(candidateCount, vocabulary, recentSentences) {
  let prompt =
    `你是一个辅助失语症患者表达的 AI 助手。\n` +
    `用户会给你一组图片对应的词语标签（按他们想表达的顺序排列）。\n` +
    `请根据这些标签生成 ${candidateCount} 个自然、通顺的中文短句候选。\n` +
    `要求：\n` +
    `- 句子简短明了，适合日常沟通\n` +
    `- 保持原始词语的语义和顺序意图\n` +
    `- 每个候选句风格略有不同（正式/随意/礼貌）\n` +
    `- 只输出句子，每行一个，不要编号或额外说明`

  if (vocabulary) {
    prompt +=
      `\n\n图库中存在的词汇（部分列表，按使用频率排序）：\n${vocabulary}` +
      `\n在造句时，请优先使用以上词汇，以便患者认出对应的图片。`
  }

  if (Array.isArray(recentSentences) && recentSentences.length > 0) {
    prompt += '\n\n本次对话近期记录（最旧→最新，供语义衔接参考）：'
    recentSentences.forEach((sentence, index) => {
      prompt += `\n  ${index + 1}. ${sentence}`
    })
    prompt += '\n请在语义上与以上记录保持自然连贯，但不要简单重复。'
  }

  return prompt
}

exports.main = async (event) => {
  try {
    const config = getConfig()
    if (!config) {
      return { code: -1, message: 'AI_API_KEY 未配置', data: null }
    }

    const req = event.request || {}
    const pictogramLabels = Array.isArray(req.pictogramLabels) ? req.pictogramLabels : []
    if (pictogramLabels.length === 0) {
      return { code: -1, message: 'pictogramLabels 不能为空', data: null }
    }
    const candidateCount = Math.min(Math.max(Number(req.candidateCount) || 5, 1), 10)

    const vocabulary = getPictogramVocabularyHint(200)
    const systemPrompt = buildSystemPrompt(
      candidateCount,
      vocabulary,
      req.context && req.context.recentSentences
    )
    const userPrompt = `词语标签：${pictogramLabels.join('、')}`

    const res = await postJson(
      `${config.baseUrl}/chat/completions`,
      {
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      { Authorization: `Bearer ${config.apiKey}` },
      UPSTREAM_TIMEOUT_MS
    )

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`AI upstream error ${res.status}: ${res.body.slice(0, 300)}`)
    }

    let data
    try {
      data = JSON.parse(res.body)
    } catch (err) {
      throw new Error('AI upstream returned invalid JSON')
    }

    const content =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
    const candidates = content
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, candidateCount)

    if (candidates.length === 0) {
      throw new Error('NLG returned empty response')
    }

    return {
      code: 0,
      message: 'success',
      data: { candidates, provider: 'cloud-ai', isOfflineFallback: false }
    }
  } catch (err) {
    console.error('[aiSentences] error:', err)
    return { code: -1, message: err.message || '服务异常', data: null }
  }
}
