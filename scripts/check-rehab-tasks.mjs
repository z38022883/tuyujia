#!/usr/bin/env node
/**
 * 康复题库校验器（批次 2）
 *
 * 对 tasks.manual.json + tasks.generated.json 全量校验，并生成覆盖矩阵报告：
 *  docs/产品方案/康复题库覆盖矩阵.md
 *
 * 校验项：
 *  S1  结构合法：必填字段齐全、level/dimension 枚举合法、payload.taskType 一致
 *  S2  id 全局唯一（manual + generated）
 *  S3  图符引用无断链（answerId/optionIds/pairs/hintIds/scene/items 全部存在于图库）
 *  S4  pick：answerId ∈ optionIds、选项去重、≥3 项、word 与答案图标签一致
 *  S5  pick 平行组：同 parallelGroup 组合互不相同；重度听词指认每词 ≥3 套
 *  S6  match：3-6 对、图文标签一致、图/词均不重复
 *  S7  categorize：≥2 桶、桶 key 唯一、6-9 词、词不重复、归属桶存在；
 *      生成题（g- 前缀）额外要求 item 真实 categoryId === 桶 key
 *  S8  instruction：1-3 步、每步非空、hint 图合法
 *  S9  短文类：passage 非空且 ≤140 字（TTS 上限 150，留余量）
 *  S10 reading-comprehension：≥3 个互不重复选项、answerIndex 合法
 *  S11 trace-char：1-4 个汉字
 *  S12 script-dialogue：≥2 轮、照护者起头、角色交替、台词非空
 *  C1  覆盖达标：重 ≥60 / 中 ≥80 / 轻 ≥80；每级 4 维度均有题且 ≥5
 *
 * 用法：node scripts/check-rehab-tasks.mjs
 * 校验失败 exit 1；报告文件始终重写。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'))

const manual = readJson('src/data/rehab/tasks.manual.json')
const generated = readJson('src/data/rehab/tasks.generated.json')
const pictograms = readJson('src/data/seed/pictograms.json')
const byId = new Map(pictograms.map((p) => [p.id, p]))
const labelOf = (id) => byId.get(id)?.labels?.zh?.[0]

const all = [...manual, ...generated]
const LEVELS = ['severe', 'moderate', 'mild']
const DIMS = ['listening', 'speaking', 'reading', 'writing']
const TYPE_LABELS = {
  'pick-from-pictograms': '听词指认/看字选图',
  'match-pair': '图文配对',
  'instruction-check': '听指令执行',
  'follow-read': '跟读复述',
  'describe-picture': '看图描述',
  categorize: '词汇分类',
  'listen-recall': '听短文复述',
  'reading-comprehension': '阅读理解',
  'trace-char': '汉字临摹',
  'idiom-read': '成语朗读',
  'melody-hum': '旋律哼唱',
  'script-dialogue': '生活脚本对话'
}
const LEVEL_LABELS = { severe: '重度', moderate: '中度', mild: '轻度' }
const DIM_LABELS = { listening: '听理解', speaking: '口语表达', reading: '阅读', writing: '书写' }

const errors = []
const warns = []
const err = (rule, task, msg) => errors.push(`[${rule}] ${task?.id ?? '(global)'}: ${msg}`)
const warn = (rule, task, msg) => warns.push(`[${rule}] ${task?.id ?? '(global)'}: ${msg}`)

// ===== S1 结构 =====
for (const t of all) {
  for (const f of ['id', 'taskType', 'title', 'level', 'dimension', 'difficulty', 'prompt', 'payload', 'enabled']) {
    if (t[f] === undefined) err('S1', t, `缺字段 ${f}`)
  }
  if (!LEVELS.includes(t.level)) err('S1', t, `level 非法: ${t.level}`)
  if (!DIMS.includes(t.dimension)) err('S1', t, `dimension 非法: ${t.dimension}`)
  if (t.payload?.taskType !== t.taskType) err('S1', t, `payload.taskType(${t.payload?.taskType}) 与 taskType(${t.taskType}) 不一致`)
}

// ===== S2 id 唯一 =====
{
  const seen = new Map()
  for (const t of all) {
    if (seen.has(t.id)) err('S2', t, `id 重复（首次出现在 ${seen.get(t.id)}）`)
    else seen.set(t.id, t.id)
  }
}

// ===== 题型专项 =====
const refFields = []
for (const t of all) {
  const p = t.payload ?? {}
  switch (t.taskType) {
    case 'pick-from-pictograms': {
      // S3 图符引用
      for (const id of p.optionIds ?? []) if (!byId.has(id)) err('S3', t, `optionIds 断链: ${id}`)
      if (!byId.has(p.answerId)) err('S3', t, `answerId 断链: ${p.answerId}`)
      // S4
      const opts = p.optionIds ?? []
      if (!opts.includes(p.answerId)) err('S4', t, 'answerId 不在 optionIds 中')
      if (new Set(opts).size !== opts.length) err('S4', t, 'optionIds 存在重复')
      if (opts.length < 3) err('S4', t, `选项过少: ${opts.length}`)
      const zh = labelOf(p.answerId)
      if (zh !== p.word) err('S4', t, `word(${p.word}) 与答案图标签(${zh}) 不一致`)
      refFields.push(...(opts ?? []).map((id) => [t, id]))
      break
    }
    case 'match-pair': {
      const pairs = p.pairs ?? []
      if (pairs.length < 3 || pairs.length > 6) err('S6', t, `配对数 ${pairs.length} 不在 3-6`)
      const texts = new Set()
      const ids = new Set()
      for (const pr of pairs) {
        if (!byId.has(pr.pictogramId)) err('S3', t, `配对图断链: ${pr.pictogramId}`)
        const zh = labelOf(pr.pictogramId)
        if (zh !== pr.text) err('S6', t, `配对词(${pr.text}) 与图标签(${zh}) 不一致`)
        if (texts.has(pr.text)) err('S6', t, `配对词重复: ${pr.text}`)
        if (ids.has(pr.pictogramId)) err('S6', t, `配对图重复: ${pr.pictogramId}`)
        texts.add(pr.text)
        ids.add(pr.pictogramId)
        refFields.push([t, pr.pictogramId])
      }
      break
    }
    case 'categorize': {
      const cats = p.categories ?? []
      const items = p.items ?? []
      const keys = new Set(cats.map((c) => c.key))
      if (cats.length < 2) err('S7', t, '分类桶 <2')
      if (keys.size !== cats.length) err('S7', t, '分类桶 key 重复')
      if (items.length < 6 || items.length > 9) err('S7', t, `分类词数 ${items.length} 不在 6-9`)
      const ids = new Set()
      const perBucket = new Map(cats.map((c) => [c.key, 0]))
      for (const it of items) {
        if (!byId.has(it.id)) err('S3', t, `分类词断链: ${it.id}`)
        if (!keys.has(it.category)) err('S7', t, `分类词 ${it.id} 归属不存在的桶: ${it.category}`)
        if (ids.has(it.id)) err('S7', t, `分类词重复: ${it.id}`)
        ids.add(it.id)
        perBucket.set(it.category, (perBucket.get(it.category) ?? 0) + 1)
        refFields.push([t, it.id])
        // 生成题严格校验真实类别
        if (t.id.startsWith('g-') && byId.get(it.id)?.categoryId !== it.category) {
          err('S7', t, `生成题分类词 ${it.id} 真实类别(${byId.get(it.id)?.categoryId}) ≠ 桶(${it.category})`)
        }
      }
      for (const [k, n] of perBucket) if (n < 2) err('S7', t, `桶 ${k} 词数 ${n} <2`)
      // 同题内标签不可重复（分类依据是词面+图）
      const labels = items.map((it) => labelOf(it.id))
      if (new Set(labels).size !== labels.length) warn('S7', t, `分类词标签重复: ${labels.join(',')}`)
      break
    }
    case 'instruction-check': {
      const steps = p.steps ?? []
      if (steps.length < 1 || steps.length > 3) err('S8', t, `步数 ${steps.length} 不在 1-3`)
      steps.forEach((s, i) => {
        if (!s || !s.trim()) err('S8', t, `第 ${i + 1} 步为空`)
      })
      for (const id of p.hintIds ?? []) {
        if (!byId.has(id)) err('S3', t, `hintIds 断链: ${id}`)
        refFields.push([t, id])
      }
      break
    }
    case 'follow-read': {
      if (!p.sentence?.trim()) err('S9', t, '跟读句为空')
      for (const id of p.pictogramIds ?? []) {
        if (!byId.has(id)) err('S3', t, `pictogramIds 断链: ${id}`)
        refFields.push([t, id])
      }
      break
    }
    case 'describe-picture': {
      if (!(p.scenePictogramIds ?? []).length) err('S9', t, '场景图为空')
      for (const id of p.scenePictogramIds ?? []) {
        if (!byId.has(id)) err('S3', t, `scenePictogramIds 断链: ${id}`)
        refFields.push([t, id])
      }
      if (!(p.keyPoints ?? []).length) err('S9', t, '描述要点为空')
      break
    }
    case 'listen-recall': {
      const len = (p.passage ?? '').length
      if (!p.passage?.trim()) err('S9', t, '短文为空')
      else if (len > 140) err('S9', t, `短文 ${len} 字 >140（TTS 上限）`)
      if (!(p.keyPoints ?? []).length) err('S9', t, '复述要点为空')
      break
    }
    case 'reading-comprehension': {
      const len = (p.passage ?? '').length
      if (!p.passage?.trim()) err('S9', t, '短文为空')
      else if (len > 140) err('S9', t, `短文 ${len} 字 >140（TTS 上限）`)
      if (!p.question?.trim()) err('S10', t, '问题为空')
      const opts = p.options ?? []
      if (opts.length < 3) err('S10', t, `选项 ${opts.length} <3`)
      if (new Set(opts).size !== opts.length) err('S10', t, '选项重复')
      if (p.answerIndex === undefined || p.answerIndex < 0 || p.answerIndex >= opts.length) {
        err('S10', t, `answerIndex 非法: ${p.answerIndex}`)
      }
      break
    }
    case 'trace-char': {
      const chars = [...(p.text ?? '')]
      if (chars.length < 1 || chars.length > 4) err('S11', t, `临摹字数 ${chars.length} 不在 1-4`)
      if (!/^[\u4e00-\u9fff]+$/.test(p.text ?? '')) err('S11', t, '临摹内容含非汉字字符')
      break
    }
    case 'idiom-read': {
      if (!(p.idiom ?? '').trim()) err('S9', t, '成语为空')
      if (!(p.meaning ?? '').trim()) warn('S9', t, '成语释义为空')
      break
    }
    case 'melody-hum': {
      if (!(p.song ?? '').trim()) err('S9', t, '歌名为空')
      if (!(p.lyrics ?? '').trim()) err('S9', t, '歌词为空')
      break
    }
    case 'script-dialogue': {
      const turns = p.turns ?? []
      if (turns.length < 2) err('S12', t, `对话轮数 ${turns.length} <2`)
      turns.forEach((tu, i) => {
        if (!tu.line?.trim()) err('S12', t, `第 ${i + 1} 轮台词为空`)
        if (tu.role !== 'caregiver' && tu.role !== 'patient') err('S12', t, `第 ${i + 1} 轮角色非法: ${tu.role}`)
        for (const id of tu.hintIds ?? []) {
          if (!byId.has(id)) err('S3', t, `turn hintIds 断链: ${id}`)
          refFields.push([t, id])
        }
      })
      if (turns[0]?.role !== 'caregiver') err('S12', t, '对话应由照护者起头')
      for (let i = 1; i < turns.length; i++) {
        if (turns[i].role === turns[i - 1].role) err('S12', t, `第 ${i + 1} 轮角色未交替`)
      }
      break
    }
    default:
      err('S1', t, `未知 taskType: ${t.taskType}`)
  }
}

// ===== S5 平行组 =====
{
  const groups = new Map()
  for (const t of all) {
    if (!t.parallelGroup) continue
    const k = `${t.level}|${t.parallelGroup}`
    const g = groups.get(k) ?? { combos: new Set(), tasks: [] }
    g.combos.add((t.payload.optionIds ?? []).slice().sort().join(','))
    g.tasks.push(t)
    groups.set(k, g)
  }
  for (const [k, g] of groups) {
    if (g.combos.size !== g.tasks.length) {
      err('S5', g.tasks[0], `平行组 ${k} 存在 ${g.tasks.length - g.combos.size} 套相同选项组合`)
    }
  }
  // 重度听词指认：每个词 ≥3 套平行组
  for (const [k, g] of groups) {
    if (!k.startsWith('severe|pick:')) continue
    if (g.tasks.length < 3) err('S5', g.tasks[0], `重度核心词平行组 ${k} 仅 ${g.tasks.length} 套（需 ≥3）`)
  }
}

// ===== C1 覆盖达标 =====
const VOLUME_TARGET = { severe: 60, moderate: 80, mild: 80 }
const byLevelDim = {}
const byLevelType = {}
for (const t of all) {
  byLevelDim[t.level] = byLevelDim[t.level] ?? {}
  byLevelDim[t.level][t.dimension] = (byLevelDim[t.level][t.dimension] ?? 0) + 1
  byLevelType[t.level] = byLevelType[t.level] ?? {}
  byLevelType[t.level][t.taskType] = (byLevelType[t.level][t.taskType] ?? 0) + 1
}
for (const lv of LEVELS) {
  const total = Object.values(byLevelDim[lv] ?? {}).reduce((a, b) => a + b, 0)
  if (total < VOLUME_TARGET[lv]) err('C1', { id: `${lv}` }, `${LEVEL_LABELS[lv]}题量 ${total} < ${VOLUME_TARGET[lv]}`)
  for (const d of DIMS) {
    const n = byLevelDim[lv]?.[d] ?? 0
    if (n === 0) err('C1', { id: `${lv}/${d}` }, `${LEVEL_LABELS[lv]}缺维度 ${DIM_LABELS[d]}`)
    else if (n < 5) warn('C1', { id: `${lv}/${d}` }, `${LEVEL_LABELS[lv]}·${DIM_LABELS[d]} 仅 ${n} 题（<5，轮换空间小）`)
  }
}

// ===== 报告 =====
const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`

const lvlTotal = (lv) => Object.values(byLevelDim[lv] ?? {}).reduce((a, b) => a + b, 0)

let md = `# 康复题库覆盖矩阵\n\n`
md += `> 由 \`scripts/check-rehab-tasks.mjs\` 自动生成（${stamp}），请勿手改。\n`
md += `> 数据源：\`tasks.manual.json\`（手写 ${manual.length} 题）+ \`tasks.generated.json\`（生成 ${generated.length} 题），合计 ${all.length} 题。\n\n`

md += `## 校验结果\n\n`
md += errors.length === 0 ? `**全部校验通过 ✅**（0 错误${warns.length ? `，${warns.length} 提醒` : ''}）\n` : `**${errors.length} 项校验失败 ❌**\n`
for (const e of errors) md += `- ❌ ${e}\n`
for (const w of warns) md += `- ⚠️ ${w}\n`
md += `\n校验规则：S1 结构 / S2 id 唯一 / S3 图符无断链 / S4 选项合法 / S5 平行组≥3 且组合互异 / S6 图文配对 / S7 词汇分类归属 / S8 指令步数 / S9 短文≤140 字 / S10 阅读选项 / S11 临摹 1-4 字 / S12 对话角色交替 / C1 覆盖达标（重≥60·中≥80·轻≥80，4 维度≥5）\n\n`

md += `## 等级 × 维度矩阵\n\n`
md += `| 等级 | 听理解 | 口语表达 | 阅读 | 书写 | 合计 | 目标 | 达标 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | :---: |\n`
for (const lv of LEVELS) {
  const cells = DIMS.map((d) => byLevelDim[lv]?.[d] ?? 0)
  const total = cells.reduce((a, b) => a + b, 0)
  md += `| ${LEVEL_LABELS[lv]}(${lv}) | ${cells.join(' | ')} | ${total} | ≥${VOLUME_TARGET[lv]} | ${total >= VOLUME_TARGET[lv] ? '✅' : '❌'} |\n`
}

md += `\n## 等级 × 题型分布\n\n`
md += `| 题型 | 重度 | 中度 | 轻度 | 合计 |\n| --- | ---: | ---: | ---: | ---: |\n`
for (const [type, label] of Object.entries(TYPE_LABELS)) {
  const cells = LEVELS.map((lv) => byLevelType[lv]?.[type] ?? 0)
  const total = cells.reduce((a, b) => a + b, 0)
  if (total === 0) continue
  md += `| ${label} | ${cells.join(' | ')} | ${total} |\n`
}

md += `\n## 重度核心词平行组（听词指认）\n\n`
md += `同一目标词多套选项组合，供跨天轮换防「背题」。\n\n`
md += `| 目标词 | 平行组数 | 来源 |\n| --- | ---: | --- |\n`
const parallelRows = []
for (const t of all) {
  if (t.level === 'severe' && t.parallelGroup?.startsWith('pick:')) {
    parallelRows.push([t.parallelGroup.slice(5), t])
  }
}
{
  const byWord = new Map()
  for (const [w, t] of parallelRows) {
    const e = byWord.get(w) ?? { n: 0, src: new Set() }
    e.n += 1
    e.src.add(t.id.startsWith('g-') ? '生成' : '手写')
    byWord.set(w, e)
  }
  for (const [w, e] of [...byWord.entries()].sort()) {
    md += `| ${w} | ${e.n} | ${[...e.src].join('+')} |\n`
  }
}

md += `\n## 维度依据\n\n`
md += `分级与维度划分源自 \`docs/产品方案/康复分级文献笔记.md\`（WAB 失语商 AQ 分级 × 听理解/口语表达/读写/家庭支持四线），题型与分级映射见 \`docs/产品方案/康复训练模块方案.md\`。\n`

const reportPath = path.join(root, 'docs/产品方案/康复题库覆盖矩阵.md')
writeFileSync(reportPath, md, 'utf8')

console.log(`题库合计 ${all.length} 题（手写 ${manual.length} + 生成 ${generated.length}）`)
for (const lv of LEVELS) {
  console.log(`  ${LEVEL_LABELS[lv]}: ${lvlTotal(lv)} 题（目标 ≥${VOLUME_TARGET[lv]}）`)
}
if (errors.length) {
  console.error(`\n${errors.length} 项校验失败 ❌`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`\n全部校验通过 ✅${warns.length ? `（${warns.length} 提醒）` : ''}，报告已写入 docs/产品方案/康复题库覆盖矩阵.md`)
for (const w of warns) console.warn(`  ⚠️ ${w}`)
