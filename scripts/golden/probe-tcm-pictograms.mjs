/**
 * TCM（中医药）候选词 ARASAAC 可图示性探测。
 *
 * 用法：node scripts/golden/probe-tcm-pictograms.mjs
 * 输出：控制台 markdown 表 + scripts/golden/_tcm-probe-result.json（供草案文档引用）
 *
 * 逻辑：
 * 1. 先查本地词表索引 _lexicon-index.json —— 已覆盖的词标记为「同义词闭环」候选（不新增图符）；
 * 2. 未覆盖的词依次查 ARASAAC 中文 / 英文检索接口，取 schematic 优先的第一结果；
 * 3. 对命中的图符 id 做 300px 图片 HEAD 可达性校验。
 * 只读不改：本脚本不写入 pictograms.json。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INDEX_FILE = path.resolve(__dirname, '_lexicon-index.json')
const OUT_FILE = path.resolve(__dirname, '_tcm-probe-result.json')

const lexicon = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')).index

/**
 * 候选词定义
 * word: 检索词；en: 英文兜底检索词；propose: 建议的新图符 id；category: 建议分类；
 * synonyms: 建议同义词；note: 备注价值
 */
const CANDIDATES = [
  // —— 症状描述 ——
  { word: '失眠', en: 'insomnia', propose: 'm_insomnia', category: 'medical', synonyms: ['睡不着', '睡不好'], note: '高频主诉' },
  { word: '便秘', en: 'constipation', propose: 'm_constipation', category: 'medical', synonyms: ['大便干'], note: '高频主诉' },
  { word: '腹泻', en: 'diarrhea', propose: 'm_diarrhea', category: 'medical', synonyms: ['拉肚子', '拉稀'], note: '高频主诉' },
  { word: '出汗', en: 'sweat', propose: 'm_sweat', category: 'medical', synonyms: ['流汗', '出虚汗', '盗汗'], note: '中医问诊要素（自汗/盗汗）' },
  { word: '口干', en: 'dry mouth', propose: 'm_dry_mouth', category: 'medical', synonyms: ['嘴干', '口渴'], note: '中医问诊要素；亦可能与 渭p_thirsty 闭环' },
  { word: '没胃口', en: ['appetite', 'hunger', 'anorexia'], zh2: ['食欲'], propose: 'm_no_appetite', category: 'medical', synonyms: ['不想吃', '胃口差'], note: '脾虚主诉' },
  { word: '心慌', en: ['palpitation', 'heartbeat', 'arrhythmia'], zh2: ['心跳'], propose: 'm_palpitation', category: 'medical', synonyms: ['心悸', '心跳快'], note: '高频主诉' },
  { word: '耳鸣', en: 'tinnitus', propose: 'm_tinnitus', category: 'medical', synonyms: ['耳朵响'], note: '肾虚主诉' },
  { word: '痒', en: 'itch', propose: 'm_itch', category: 'medical', synonyms: ['瘙痒', '发痒'], note: '皮肤症状，通用' },
  { word: '痰', en: 'mucus', propose: 'm_phlegm', category: 'medical', synonyms: ['有痰', '咳痰'], note: '痰湿主诉' },
  { word: '苦', en: 'bitter', propose: 'p_bitter', category: 'food', synonyms: ['味苦'], note: '「中药苦」高频表达' },
  // —— 治疗/疗法 ——
  { word: '针灸', en: 'acupuncture', propose: 'tcm_acupuncture', category: 'medical', synonyms: ['扎针', '银针'], note: '中医特色核心词' },
  { word: '推拿', en: 'massage', propose: 'tcm_tuina', category: 'medical', synonyms: ['按摩', '揉一揉'], note: '中医特色核心词' },
  { word: '拔罐', en: ['cupping', 'cupping therapy', 'suction cups'], zh2: ['拔火罐', '罐'], propose: 'tcm_cupping', category: 'medical', synonyms: ['吸罐'], note: '中医特色核心词' },
  { word: '艾灸', en: ['moxibustion', 'cauterization'], zh2: ['灸'], propose: 'tcm_moxibustion', category: 'medical', synonyms: ['灸'], note: '中医特色；ARASAAC 大概率无图' },
  { word: '把脉', en: 'pulse', propose: 'tcm_pulse', category: 'medical', synonyms: ['号脉', '诊脉', '摸脉'], note: '中医特色核心词' },
  { word: '中药', en: ['herbal medicine', 'medicinal herbs', 'herbs', 'medicine bottle', 'syrup'], zh2: ['草药', '煎药', '汤药'], propose: 'tcm_herbs', category: 'medical', synonyms: ['汤药', '草药', '中药汤'], note: '中医特色核心词' },
  { word: '膏药', en: 'bandage', propose: 'tcm_plaster', category: 'medical', synonyms: ['药膏', '贴膏药'], note: '外治法' },
  { word: '热敷', en: 'hot water bottle', propose: 'tcm_hot_compress', category: 'medical', synonyms: ['敷一敷', '热毛巾敷'], note: '外治法' },
  { word: '泡脚', en: 'foot bath', propose: 'tcm_foot_bath', category: 'daily', synonyms: ['洗脚', '烫脚'], note: '中医养生；图示性存疑' },
  { word: '复诊', en: 'appointment', propose: 'm_follow_up', category: 'medical', synonyms: ['复查', '再来医院'], note: '诊疗流程' },
  { word: '忌口', en: 'diet', propose: 'tcm_diet_restriction', category: 'food', synonyms: ['不能吃', '管住嘴'], note: '图示性存疑；可能由 否定+吃 表达' },
  { word: '舒服', en: 'comfortable', propose: 'e_comfortable', category: 'emotions', synonyms: ['舒服些', '好受'], note: '疗效反馈，通用高频' },
  // —— 身体部位补充（句子里指认部位用）——
  { word: '腰', en: 'waist', propose: 'p_waist', category: 'daily', synonyms: ['腰部', '后腰'], note: '腰疼为推拿/针灸高频部位' },
  { word: '膝盖', en: 'knee', propose: 'p_knee', category: 'daily', synonyms: ['膝关节'], note: '膝盖疼为针灸高频部位' },
  { word: '辣', en: 'spicy', propose: 'p_spicy', category: 'food', synonyms: ['辣椒'], note: '忌口语境（不吃辣）' }
]

// 只探测指定词（逗号分隔），用于未命中词的备用词重探
const ONLY = process.argv[2] ? new Set(process.argv[2].split(',')) : null

// 已在词库的词 → 同义词闭环候选（不新增图符）
const CLOSE_WORDS = [
  { word: '怕冷', target: '冷 p_cold', note: '畏寒主诉；「怕冷」入 p_cold 同义词' },
  { word: '头晕', target: '头晕 p_dizzy', note: '已覆盖，中医场景直接复用' },
  { word: '乏力', target: '累 p_tired', note: '「乏力/没力气」入 p_tired 同义词' },
  { word: '中医', target: '医生 p_doctor', note: '「中医/中医大夫」入 p_doctor 同义词，不单开图' },
  { word: '上火', target: '（不处理）', note: '抽象概念，不可图示，排除——保持图库高语义透明度' },
  { word: '湿气', target: '（不处理）', note: '抽象概念，排除' },
  { word: '阴虚', target: '（不处理）', note: '抽象概念，排除' },
  { word: '阳虚', target: '（不处理）', note: '抽象概念，排除' },
  { word: '气虚', target: '（不处理）', note: '抽象概念，排除' },
  { word: '经络', target: '（不处理）', note: '抽象概念，排除' },
  { word: '穴位', target: '（不处理）', note: '抽象概念，排除' }
]

const ZH_API = 'https://api.arasaac.org/api/pictograms/zh/search/'
const EN_API = 'https://api.arasaac.org/api/pictograms/en/search/'

async function fetchJson(url, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
      if (!res.ok) return null
      return await res.json()
    } catch {
      // 超时/网络抖动：重试一次
    }
  }
  return null
}

async function search(base, word) {
  const arr = await fetchJson(base + encodeURIComponent(word))
  return Array.isArray(arr) ? arr : []
}

/** schematic 优先，其次 aac 标记，取第一 */
function pick(arr) {
  const sorted = [...arr].sort((a, b) => (b.schematic === true) - (a.schematic === true))
  return sorted[0] || null
}

async function headOk(id) {
  try {
    const res = await fetch(`https://static.arasaac.org/pictograms/${id}/${id}_300.png`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(12000)
    })
    return res.ok
  } catch {
    return false
  }
}

async function probeOne(c) {
  const out = { word: c.word, covered: lexicon[c.word] ? lexicon[c.word].ids : null }
  if (out.covered) return out

  // 检索链：中文原词 → 中文备用词(zh2) → 英文备用词(en，可数组)
  const tries = [
    ['zh', ZH_API, c.word],
    ...(Array.isArray(c.zh2) ? c.zh2.map((w) => ['zh', ZH_API, w]) : []),
    ...(Array.isArray(c.en) ? c.en.map((w) => ['en', EN_API, w]) : [['en', EN_API, c.en]])
  ]
  let hit = null
  let viaLang = null
  const searches = {}
  for (const [lang, base, w] of tries) {
    const arr = await search(base, w)
    searches[`${lang}:${w}`] = arr.length
    const p = pick(arr)
    if (p) {
      hit = p
      viaLang = `${lang}:${w}`
      break
    }
  }
  out.searches = searches
  if (hit) {
    out.hit = {
      arasaacId: hit._id,
      via: viaLang,
      schematic: hit.schematic === true,
      aac: Array.isArray(hit.tags) && hit.tags.includes('aac'),
      url: `https://static.arasaac.org/pictograms/${hit._id}/${hit._id}_300.png`,
      urlOk: await headOk(hit._id)
    }
  }
  return out
}

const candidates = ONLY ? CANDIDATES.filter((c) => ONLY.has(c.word)) : CANDIDATES

// 并发 3，避免压接口
const results = []
for (let i = 0; i < candidates.length; i += 3) {
  const batch = candidates.slice(i, i + 3)
  const rs = await Promise.all(batch.map(probeOne))
  results.push(...rs)
  process.stdout.write(`  ${Math.min(i + 3, candidates.length)}/${candidates.length}\n`)
}

// ONLY 模式下与既有结果合并（按 word 覆盖），保留首轮数据
let merged = results
if (ONLY && fs.existsSync(OUT_FILE)) {
  const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
  const map = new Map(prev.results.map((r) => [r.word, r]))
  for (const r of results) map.set(r.word, r)
  merged = [...map.values()]
}
fs.writeFileSync(
  OUT_FILE,
  JSON.stringify({ probedAt: new Date().toISOString(), results: merged }, null, 2)
)

// —— 输出 markdown 表 ——
console.log('\n| 词 | 词库现状 | ARASAAC 命中 | schematic | aac | 图片可达 | 建议新 id |')
console.log('|---|---|---|---|---|---|---|')
for (const r of merged) {
  if (r.covered) {
    console.log(`| ${r.word} | 已覆盖 ${r.covered.join(',')} | — | — | — | — | 同义词闭环 |`)
  } else if (r.hit) {
    console.log(
      `| ${r.word} | 无 | #${r.hit.arasaacId} (${r.hit.via}) | ${r.hit.schematic ? '✓' : '✗'} | ${r.hit.aac ? '✓' : '✗'} | ${r.hit.urlOk ? '✓' : '✗'} | ${CANDIDATES.find((c) => c.word === r.word)?.propose || ''} |`
    )
  } else {
    console.log(`| ${r.word} | 无 | ✗ 无结果 ${r.searches ? JSON.stringify(r.searches) : ''} | — | — | — | 排除或手绘 |`)
  }
}
console.log('\n结果已存:', OUT_FILE)
