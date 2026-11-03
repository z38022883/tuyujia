/**
 * 第二版 · 中医药词汇补图（2026-11-03 用户筛选定稿）。
 *
 * 筛选决议（docs/算法优化/第二版-留出集与中医词汇/01-候选词与测试句草案.md）：
 * - 新增 17 个 ARASAAC 图符（中药=草药店 #26126；膏药=贴药贴 #29024）；
 * - 5 处同义词闭环，不新增图（怕冷/口干/乏力/中医/不舒服）；
 * - 手绘待办（ARASAAC 无图，暂缓）：泡脚 #25845（候选图与洗澡近似，弃用）、拔罐、艾灸、把脉、热敷。
 *
 * 图源与现有 seed 一致：https://static.arasaac.org/pictograms/{id}/{id}_300.png
 * 用法：node scripts/golden/fill-tcm-gaps.mjs（幂等，重复执行跳过已有 id）
 * 之后需：node scripts/golden/build-lexicon-index.cjs 刷新词表索引。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.resolve(__dirname, '../../src/data/seed/pictograms.json')

const raw = fs.readFileSync(FILE, 'utf8')
const CRLF = raw.includes('\r\n')
const pics = JSON.parse(raw)

/** 新增条目：arasaacId 来自 api.arasaac.org 检索 + 逐一目检（55 张比对记录见 _tcm-probe-result.json） */
const NEW = [
  // —— 症状描述 ——
  {
    id: 'm_insomnia', imageUrl: 'https://static.arasaac.org/pictograms/31276/31276_300.png',
    labels: { zh: ['失眠'], en: ['insomnia'] }, categoryId: 'medical',
    synonyms: ['睡不着', '睡不好', '入睡困难'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_constipation', imageUrl: 'https://static.arasaac.org/pictograms/37829/37829_300.png',
    labels: { zh: ['便秘'], en: ['constipation'] }, categoryId: 'medical',
    synonyms: ['大便干', '拉不出来'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_diarrhea', imageUrl: 'https://static.arasaac.org/pictograms/38314/38314_300.png',
    labels: { zh: ['腹泻'], en: ['diarrhea'] }, categoryId: 'medical',
    synonyms: ['拉肚子', '拉稀', '闹肚子'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_sweat', imageUrl: 'https://static.arasaac.org/pictograms/35721/35721_300.png',
    labels: { zh: ['出汗'], en: ['sweat'] }, categoryId: 'medical',
    synonyms: ['流汗', '出虚汗', '盗汗'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_tinnitus', imageUrl: 'https://static.arasaac.org/pictograms/39508/39508_300.png',
    labels: { zh: ['耳鸣'], en: ['tinnitus'] }, categoryId: 'medical',
    synonyms: ['耳朵响', '嗡嗡响'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_itch', imageUrl: 'https://static.arasaac.org/pictograms/11356/11356_300.png',
    labels: { zh: ['痒'], en: ['itch'] }, categoryId: 'medical',
    synonyms: ['瘙痒', '发痒'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_phlegm', imageUrl: 'https://static.arasaac.org/pictograms/25249/25249_300.png',
    labels: { zh: ['痰'], en: ['phlegm'] }, categoryId: 'medical',
    synonyms: ['有痰', '咳痰'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_palpitation', imageUrl: 'https://static.arasaac.org/pictograms/5490/5490_300.png',
    labels: { zh: ['心慌'], en: ['palpitation'] }, categoryId: 'medical',
    synonyms: ['心悸', '胸口闷', '心跳快'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  // —— 味觉/表达侧 ——
  {
    id: 'p_bitter', imageUrl: 'https://static.arasaac.org/pictograms/37832/37832_300.png',
    labels: { zh: ['苦'], en: ['bitter'] }, categoryId: 'food',
    synonyms: ['味苦', '太苦'], disambiguationHints: { semanticDomain: 'food' }, usageCount: 0
  },
  {
    id: 'p_spicy', imageUrl: 'https://static.arasaac.org/pictograms/37834/37834_300.png',
    labels: { zh: ['辣'], en: ['spicy'] }, categoryId: 'food',
    synonyms: ['辣椒', '太辣'], disambiguationHints: { semanticDomain: 'food' }, usageCount: 0
  },
  // —— 中医疗法 ——
  {
    id: 'tcm_acupuncture', imageUrl: 'https://static.arasaac.org/pictograms/38119/38119_300.png',
    labels: { zh: ['针灸'], en: ['acupuncture'] }, categoryId: 'medical',
    synonyms: ['扎针', '银针', '针刺'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'tcm_tuina', imageUrl: 'https://static.arasaac.org/pictograms/9010/9010_300.png',
    labels: { zh: ['推拿'], en: ['massage'] }, categoryId: 'medical',
    synonyms: ['按摩', '做推拿', '揉一揉'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    // 用户决议：中药用「草药店」图（#26126，更有中医氛围）
    id: 'tcm_herbs', imageUrl: 'https://static.arasaac.org/pictograms/26126/26126_300.png',
    labels: { zh: ['中药', '草药'], en: ['Chinese herbal medicine'] }, categoryId: 'medical',
    synonyms: ['汤药', '中药汤', '熬药', '抓药'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    // 用户决议：膏药用「贴药贴」图（#29024）
    id: 'tcm_plaster', imageUrl: 'https://static.arasaac.org/pictograms/29024/29024_300.png',
    labels: { zh: ['膏药'], en: ['medicinal plaster'] }, categoryId: 'medical',
    synonyms: ['贴膏药', '膏药贴', '药膏'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_follow_up', imageUrl: 'https://static.arasaac.org/pictograms/24609/24609_300.png',
    labels: { zh: ['复诊'], en: ['follow-up visit'] }, categoryId: 'medical',
    synonyms: ['复查', '预约', '再来医院'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  // —— 身体部位（与 p_chest/p_back_body 同为 medical 分类）——
  {
    id: 'p_waist', imageUrl: 'https://static.arasaac.org/pictograms/10372/10372_300.png',
    labels: { zh: ['腰'], en: ['waist'] }, categoryId: 'medical',
    synonyms: ['腰部', '后腰'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'p_knee', imageUrl: 'https://static.arasaac.org/pictograms/14540/14540_300.png',
    labels: { zh: ['膝盖'], en: ['knee'] }, categoryId: 'medical',
    synonyms: ['膝关节'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  }
]

/** 同义词闭环：ARASAAC 无更优图，挂到既有图符（词形→既有图的同义词） */
const SYNONYM_CLOSURES = [
  { id: 'p_cold', add: ['怕冷', '畏寒'] },            // 中医十问要素
  { id: 'p_thirsty', add: ['口干', '嘴干'] },          // 口干≈渴，不重复建图
  { id: 'p_tired', add: ['乏力', '没力气', '体虚'] },   // 与"累"同一沟通意图
  { id: 'p_doctor', add: ['中医', '中医大夫', '老中医'] }, // 特色由疗法图承担
  { id: 'p_uncomfortable', add: ['不舒坦'] }   // 「不舒服」已是 p_unwell 的 label，不可重复闭环（一词两图）
]

const existingIds = new Set(pics.map((p) => p.id))
let added = 0
for (const n of NEW) {
  if (existingIds.has(n.id)) {
    console.log('跳过重复 id:', n.id)
    continue
  }
  pics.push(n)
  existingIds.add(n.id)
  added++
}

let closed = 0
for (const c of SYNONYM_CLOSURES) {
  const p = pics.find((x) => x.id === c.id)
  if (!p) {
    console.log('闭环目标缺失:', c.id)
    continue
  }
  const before = (p.synonyms || []).length
  p.synonyms = [...new Set([...(p.synonyms || []), ...c.add])]
  closed += p.synonyms.length - before
  console.log(`闭环 ${c.id} += ${c.add.join('/')}`)
}

let out = JSON.stringify(pics, null, 2)
if (CRLF) out = out.replace(/\n/g, '\r\n')
fs.writeFileSync(FILE, out + (CRLF ? '\r\n' : '\n'))
console.log(`已新增 ${added} 个图符、闭环 ${closed} 个同义词，总数 ${pics.length} -> ${FILE}`)
