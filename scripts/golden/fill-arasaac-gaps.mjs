/**
 * 从 ARASAAC 补齐 golden 集缺口图符（v2 新增 15 个 + e_relieved 同义词闭环 没事/没关系）。
 *
 * 图源与现有 seed 一致：https://static.arasaac.org/pictograms/{id}/{id}_300.png
 * 用法：node scripts/golden/fill-arasaac-gaps.mjs
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

/** 新增条目：arasaacId 来自 api.arasaac.org 检索（schematic 优先） */
const NEW = [
  {
    id: 'p_hello', imageUrl: 'https://static.arasaac.org/pictograms/6522/6522_300.png',
    labels: { zh: ['你好'], en: ['hello'] }, categoryId: 'quickchat',
    synonyms: ['您好', '打招呼'], disambiguationHints: { semanticDomain: 'quickchat' }, usageCount: 0
  },
  {
    id: 'p_goodbye', imageUrl: 'https://static.arasaac.org/pictograms/6028/6028_300.png',
    labels: { zh: ['再见'], en: ['goodbye'] }, categoryId: 'quickchat',
    synonyms: ['拜拜', '下次见'], disambiguationHints: { semanticDomain: 'quickchat' }, usageCount: 0
  },
  {
    id: 'p_sorry', imageUrl: 'https://static.arasaac.org/pictograms/11625/11625_300.png',
    labels: { zh: ['对不起'], en: ['sorry'] }, categoryId: 'quickchat',
    synonyms: ['抱歉', '请原谅'], disambiguationHints: { semanticDomain: 'quickchat' }, usageCount: 0
  },
  {
    id: 'p_hard_work', imageUrl: 'https://static.arasaac.org/pictograms/36341/36341_300.png',
    labels: { zh: ['辛苦'], en: ['hard work'] }, categoryId: 'quickchat',
    synonyms: ['辛苦啦', '劳累', '疲倦'], disambiguationHints: { semanticDomain: 'quickchat' }, usageCount: 0
  },
  {
    id: 'm_measure', imageUrl: 'https://static.arasaac.org/pictograms/33100/33100_300.png',
    labels: { zh: ['量'], en: ['measure'] }, categoryId: 'medical',
    synonyms: ['测量', '量一下', '量血压', '量体温'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'm_check', imageUrl: 'https://static.arasaac.org/pictograms/31904/31904_300.png',
    labels: { zh: ['检查'], en: ['check-up'] }, categoryId: 'medical',
    synonyms: ['检查一下', '检查身体', '查'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'e_mood', imageUrl: 'https://static.arasaac.org/pictograms/37083/37083_300.png',
    labels: { zh: ['心情'], en: ['mood'] }, categoryId: 'emotions',
    synonyms: ['情绪', '心情怎么样'], disambiguationHints: { semanticDomain: 'emotions' }, usageCount: 0
  },
  {
    id: 'p_clock', imageUrl: 'https://static.arasaac.org/pictograms/7230/7230_300.png',
    labels: { zh: ['几点'], en: ['what time'] }, categoryId: 'time',
    synonyms: ['几点钟', '几点了', '钟表', '时间'], disambiguationHints: { semanticDomain: 'time' }, usageCount: 0
  },
  {
    id: 'm_injection', imageUrl: 'https://static.arasaac.org/pictograms/5601/5601_300.png',
    labels: { zh: ['打针'], en: ['injection'] }, categoryId: 'medical',
    synonyms: ['注射', '输液'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'p_open_mouth', imageUrl: 'https://static.arasaac.org/pictograms/33908/33908_300.png',
    labels: { zh: ['张嘴'], en: ['open mouth'] }, categoryId: 'medical',
    synonyms: ['张开嘴', '张口', '张开嘴巴'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0,
    categoryIds: ['medical', 'actions']
  },
  {
    id: 'm_deep_breath', imageUrl: 'https://static.arasaac.org/pictograms/7231/7231_300.png',
    labels: { zh: ['深呼吸'], en: ['deep breath'] }, categoryId: 'medical',
    synonyms: ['深吸气', '吸气', '深呼吸一下'], disambiguationHints: { semanticDomain: 'medical' }, usageCount: 0
  },
  {
    id: 'p_raise_hand', imageUrl: 'https://static.arasaac.org/pictograms/16885/16885_300.png',
    labels: { zh: ['抬手'], en: ['raise hand'] }, categoryId: 'actions',
    synonyms: ['抬', '抬起来', '举起手', '举手'], disambiguationHints: { semanticDomain: 'actions' }, usageCount: 0
  },
  {
    id: 'a_support', imageUrl: 'https://static.arasaac.org/pictograms/21375/21375_300.png',
    labels: { zh: ['扶'], en: ['support'] }, categoryId: 'actions',
    synonyms: ['搀扶', '扶一下', '扶着'], disambiguationHints: { semanticDomain: 'actions' }, usageCount: 0
  },
  {
    id: 'pl_ambulance', imageUrl: 'https://static.arasaac.org/pictograms/6899/6899_300.png',
    labels: { zh: ['救护车'], en: ['ambulance'] }, categoryId: 'places',
    synonyms: ['急救车', '急救'], disambiguationHints: { semanticDomain: 'places' }, usageCount: 0
  },
  {
    id: 'w_rain', imageUrl: 'https://static.arasaac.org/pictograms/7148/7148_300.png',
    labels: { zh: ['下雨'], en: ['rain'] }, categoryId: 'daily',
    synonyms: ['雨天', '降雨', '下雨天'], disambiguationHints: { semanticDomain: 'daily' }, usageCount: 0
  }
]

// e_relieved（放心）追加 没事/没关系 同义词，闭环 rec-083（ARASAAC 无独立"没事"图）
const relieved = pics.find((p) => p.id === 'e_relieved')
if (relieved) {
  relieved.synonyms = [...new Set([...(relieved.synonyms || []), '没事', '没关系'])]
  console.log('e_relieved synonyms ->', relieved.synonyms.join('/'))
}

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

let out = JSON.stringify(pics, null, 2)
if (CRLF) out = out.replace(/\n/g, '\r\n')
fs.writeFileSync(FILE, out + (CRLF ? '\r\n' : '\n'))
console.log(`已新增 ${added} 个图符，总数 ${pics.length} -> ${FILE}`)
