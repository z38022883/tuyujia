/**
 * 接收分词 golden 离线评估 runner（P0）。
 *
 * 读取 scripts/golden/golden-set.json，用真实的 src/utils/text-to-image-matcher
 * 对每条句子跑匹配，计算"内容词召回"并输出报告。作为 P1/P2 优化的回归基准。
 *
 * 用法：
 *   node -r ts-node/register/transpile-only -r ./scripts/golden/register-alias.cjs \
 *        ./scripts/golden/run-golden.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import { matchTextToImages } from '../../src/utils/text-to-image-matcher'

const GOLDEN = path.join(__dirname, 'golden-set.json')
const OUT = path.join(__dirname, 'golden-report.md')

type ExpectedRole = 'content' | 'function'
interface ExpectedItem {
  segment?: string
  word: string
  pictogramId: string | null
  role: ExpectedRole
  altIds?: string[]
  note?: string
}
interface GoldenCase {
  id: string
  sentence: string
  expected: ExpectedItem[]
}
interface GoldenSet {
  schemaVersion: number
  cases: GoldenCase[]
}

const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) as GoldenSet

interface CaseResult {
  id: string
  sentence: string
  contentDenominator: number
  contentHits: number
  matchedIds: string[] // matcher 实际输出的图符 id（去重）
  expectedIds: string[] // 该句期望的有图内容词 id
  missItems: ExpectedItem[] // 未召回的内容词
  extraIds: string[] // 输出但不在期望里的图符 id
  matchRate: number
  segments: string[]
}

function isExpectedHit(exp: ExpectedItem, caseMatchedIds: Set<string>): boolean {
  if (exp.role !== 'content') return false
  if (!exp.pictogramId) return false
  if (caseMatchedIds.has(exp.pictogramId)) return true
  if (exp.altIds?.some((id) => caseMatchedIds.has(id))) return true
  return false
}

async function evaluateCase(c: GoldenCase): Promise<CaseResult> {
  const result = await matchTextToImages(c.sentence)

  const matchedIds: string[] = []
  const matchedSet = new Set<string>()
  for (const m of result.matches) {
    if (m.pictogram && !matchedSet.has(m.pictogram.id)) {
      matchedSet.add(m.pictogram.id)
      matchedIds.push(m.pictogram.id)
    }
  }

  const contentWithPic = c.expected.filter((e) => e.role === 'content' && e.pictogramId)
  const expectedIds = contentWithPic.map((e) => e.pictogramId as string)
  const expSet = new Set(expectedIds)
  const missItems = contentWithPic.filter((e) => !isExpectedHit(e, matchedSet))
  const extraIds = matchedIds.filter((id) => !expSet.has(id))

  return {
    id: c.id,
    sentence: c.sentence,
    contentDenominator: contentWithPic.length,
    contentHits: contentWithPic.length - missItems.length,
    matchedIds,
    expectedIds,
    missItems,
    extraIds,
    matchRate: result.matchRate,
    segments: result.segmentation.segments,
  }
}

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${(n / d) * 100}`.slice(0, 4) + '%'
}

async function main() {
  const results: CaseResult[] = []
  let denom = 0
  let hits = 0
  let avgRate = 0
  let fullSentenceOneToken = 0

  for (const c of golden.cases) {
    const r = await evaluateCase(c)
    results.push(r)
    denom += r.contentDenominator
    hits += r.contentHits
    avgRate += r.matchRate
    // 反作弊：整句被原样糊成单 token（而非功能词过滤后自然剩下的单 token）
    if (r.segments.length === 1 && r.segments[0] === c.sentence) {
      fullSentenceOneToken++
    }
  }
  avgRate = avgRate / (results.length || 1)

  // 累计缺口样本（pictogramId 为 null 的内容词）
  const gapItems = golden.cases.flatMap((c) =>
    c.expected.filter((e) => e.role === 'content' && !e.pictogramId)
  )

  const lines: string[] = []
  lines.push('# 接收分词 golden 基线报告')
  lines.push('')
  lines.push(`- 生成时间：${new Date().toISOString()}`)
  lines.push(`- golden 集：${golden.cases.length} 条句子`)
  lines.push(`- 内容词计分项（有图）：${denom}，已召回：${hits}`)
  lines.push(`- **内容词召回率：${hits}/${denom}（${pct(hits, denom)}）**`)
  lines.push(`- matcher 平均 matchRate（参考）：${avgRate.toFixed(3)}`)
  lines.push(`- 整句单 token 反作弊命中：${fullSentenceOneToken}`)
  lines.push(`- 图库缺口内容词样本：${gapItems.length} 个（${gapItems.map((g) => g.word).join('、') || '无'}）`)
  lines.push('')
  lines.push('## 逐条结果')
  lines.push('')
  lines.push('| id | 句子 | 内容词召回 | 未召回 | 预期外图 |')
  lines.push('|---|---|---|---|---|')
  for (const r of results) {
    const missDesc = r.missItems.map((m) => `\`${m.word}→${m.pictogramId}\``).join(', ') || '—'
    const extraDesc =
      r.extraIds.map((id) => `\`${id}\``).join(', ') || '—'
    lines.push(`| ${r.id} | ${r.sentence} | ${r.contentHits}/${r.contentDenominator} | ${missDesc} | ${extraDesc} |`)
  }

  fs.writeFileSync(OUT, lines.join('\n') + '\n')
  console.log(lines.join('\n'))
  console.log('\n报告已写入:', OUT)
}

main().catch((err) => {
  console.error('评估失败:', err)
  process.exit(1)
})