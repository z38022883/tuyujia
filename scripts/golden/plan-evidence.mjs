// P1 方案证据：逐句对比 Intl.Segmenter 现状 vs 词表贪心最长匹配
// 输出：每条 golden 句子的 Intl 切分（标出是否命中词表）、贪心切分、以及本轮 miss 的 content 词能否被贪心救回。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

const golden = JSON.parse(fs.readFileSync(path.join(root, 'scripts/golden/golden-set.json'), 'utf8'))
const pictograms = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seed/pictograms.json'), 'utf8'))

const VOCAB = new Set()
for (const p of pictograms) {
  for (const l of p.labels.zh) VOCAB.add(l)
  for (const s of p.synonyms) VOCAB.add(s)
}

// 复刻 matcher 的 stop 词（评估用）
const FUNCTION_WORDS = new Set(['需要', '要', '该', '应该', '感觉', '好像', '起来', '下来', '上来', '上去', '下去'])
const MINOR_WORDS = new Set(['了', '的', '吧', '呢', '啊', '哦', '呀', '吗', '把', '着', '过', '这', '那', '之', '么'])
const NEG = ['不', '没', '别', '勿', '莫', '未']

function intlSeg(s) {
  return [...new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(s)].map((x) => x.segment)
}
function mergeNeg(tokens) {
  const out = []
  for (let i = 0; i < tokens.length; i++) {
    if (NEG.includes(tokens[i]) && i + 1 < tokens.length) { out.push(tokens[i] + tokens[i + 1]); i++ } else out.push(tokens[i])
  }
  return out
}
// 词表贪心最长匹配（正向最大匹配，maxLen 4）
function greedySeg(s, maxLen = 4) {
  const out = []
  let i = 0
  while (i < s.length) {
    let consumed = 0
    for (let len = Math.min(maxLen, s.length - i); len >= 1; len--) {
      if (VOCAB.has(s.slice(i, i + len))) { consumed = len; break }
    }
    if (consumed === 0) { out.push(s[i]); i++ } else { out.push(s.slice(i, i + consumed)); i += consumed }
  }
  return out
}

// 只关心：本轮 miss 的 content 词、以及 forbidden 反转句
const focus = new Set()
const missInfo = []
for (const c of golden.cases) {
  for (const e of c.expected ?? []) {
    if (e.role === 'content' && e.pictogramId) {
      // 记录该 word 对应的图符词形集合
      const p = pictograms.find((x) => x.id === e.pictogramId)
      const forms = new Set([...(p?.labels.zh ?? []), ...(p?.synonyms ?? [])])
      missInfo.push({ id: c.id, word: e.word, forms, hasForm: forms.has(e.word) })
    }
  }
}

console.log('==== P1 证据：Intl 现状 vs 词表贪心 ====\n')
let savedByGreedy = 0
for (const c of golden.cases) {
  const sentence = c.sentence
  const intl = intlSeg(sentence)
  const neg = mergeNeg(intl)
  const greedy = greedySeg(sentence)
  // 该句 miss 的 content 词（word 词形在其图符 forms 里，但 Intl 未把它整成单 token）
  const missWords = c.expected
    .filter((e) => e.role === 'content' && e.pictogramId)
    .filter((e) => {
      const info = missInfo.find((m) => m.id === c.id && m.word === e.word)
      if (!info) return false
      // 若词形在词表但 Intl 切分里没有该整词 → 说明被拆散
      return info.hasForm && !neg.includes(e.word)
    })
    .map((e) => e.word)

  const greedyCanRecover = missWords.filter((w) => greedy.includes(w))
  if (missWords.length > 0) {
    savedByGreedy += greedyCanRecover.length
    console.log(`[${c.id}] ${sentence}`)
    console.log(`  Intl   : ${JSON.stringify(neg)}`)
    console.log(`  Greedy : ${JSON.stringify(greedy)}`)
    console.log(`  miss词 : ${missWords.join('、')} | 贪心可救回: ${greedyCanRecover.length ? greedyCanRecover.join('、') : '✗'}`)
    console.log('')
  }
}
console.log(`==== 合计：被 Intl 拆散导致 miss 的 content 词 ${missInfo.length ? '' : ''}，贪心最长匹配可整体救回 ${savedByGreedy} 个 ====`)
