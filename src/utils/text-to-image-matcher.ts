/**
 * 文本→图片序列匹配器（迁移自原版 picinterpreter src/utils/text-to-image-matcher.ts）。
 *
 * 管线：文本 → segmentText() 分词 → lexicon 查找 → 图库匹配 → 图片序列
 * 差异：图库改为内存 seed 数据（src/data/seed），替代原版 Dexie。
 */

import { segmentText, type SegmentResult } from './segment-text'
import { findEntry, type LexiconEntry } from '@/data/lexicon'
import { getAllPictograms } from '@/data'
import type { PictogramEntry } from '@/types'

/**
 * Strategy 4 安全：含这些前缀的 token 不做包含匹配，
 * 避免 "不开心" 匹配到 "开心" 等语义反转错误。
 */
const NEGATION_PREFIXES = ['不', '没', '别', '勿', '莫', '未'] as const

/**
 * 面向出图的功能词（情态/虚词/趋向补语），接收场景中剔除可安全降低误出图。
 * 注意：不带"来/去"这类既可作动词又可作补语的词，避免误伤内容义（如"医生来看你"）。
 */
const FUNCTION_WORDS = new Set(['需要', '要', '该', '应该', '感觉', '好像', '起来', '下来', '上来', '上去', '下去'])

/**
 * 否定复合词合并：Intl.Segmenter 常把"不+开心"切成"不""开心"两个 token，
 * 导致正面词单独命中错误图（"不开心"→p_happy）。这里把单字否定词与后随 token
 * 合成一个复合词，交由后续精确匹配整体图（或安全 miss）。
 */
function mergeNegation(tokens: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if ((NEGATION_PREFIXES as readonly string[]).includes(token) && i + 1 < tokens.length) {
      out.push(token + tokens[i + 1])
      i++
    } else {
      out.push(token)
    }
  }
  return out
}

/** 图库词表（label.zh + synonyms），用于未命中 token 的贪心拆解 */
function buildVocab(): Set<string> {
  const set = new Set<string>()
  for (const p of getAllPictograms()) {
    for (const label of p.labels.zh) set.add(label)
    for (const synonym of p.synonyms) set.add(synonym)
  }
  return set
}
const VOCAB = buildVocab()

/** 贪心拆解产出的单字虚词碎片，直接丢弃（不做匹配、不进结果序列） */
const MINOR_WORDS = new Set(['了', '的', '吧', '呢', '啊', '哦', '呀', '吗', '把', '着', '过', '这', '那', '之', '么'])

/**
 * 正向最大匹配拆解：Intl 常把口语合成非图库词（"睡了/来看/把手"）。
 * 对未命中 token，按图库词表做最长前缀切分，拆出可命中的图库词；其余单字保留。
 */
function splitByLexicon(raw: string, maxLen: number): string[] {
  const out: string[] = []
  let i = 0
  while (i < raw.length) {
    let consumed = 0
    for (let len = Math.min(maxLen, raw.length - i); len >= 1; len--) {
      if (VOCAB.has(raw.slice(i, i + len))) {
        consumed = len
        break
      }
    }
    if (consumed === 0) {
      out.push(raw[i])
      i++
    } else {
      out.push(raw.slice(i, i + consumed))
      i += consumed
    }
  }
  return out
}

type LexiconLikeEntry = {
  zh: string
  category?: string
} | null
type CandidateMatchType = 'exact' | 'synonym' | 'lexicon-synonym' | 'partial'

// 阶段间距 100，保证 semantic domain 加权只能在同阶段内改变排名，不能越级。
const MATCH_STAGE_GAP = 100
const DOMAIN_MATCH_BONUS = 40

const MATCH_STAGE_SCORE: Record<CandidateMatchType, number> = {
  exact: MATCH_STAGE_GAP * 4,
  synonym: MATCH_STAGE_GAP * 3,
  'lexicon-synonym': MATCH_STAGE_GAP * 2,
  partial: MATCH_STAGE_GAP,
}

type Candidate = {
  pictogram: PictogramEntry
  matchType: CandidateMatchType
  matchedKey?: string
  matchedLabelLength?: number
}

function parseHintList(value?: string): string[] {
  if (!value) return []
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeLexiconEntry(entry: LexiconEntry | undefined): LexiconLikeEntry {
  if (!entry) return null
  return {
    zh: entry.zh,
    category: entry.category,
  }
}

function getSemanticDomain(pictogram: PictogramEntry): string {
  return pictogram.disambiguationHints.semanticDomain ?? pictogram.categoryId
}

function buildExclusionTerms(
  token: string,
  candidate: Candidate,
  lexiconEntry: LexiconLikeEntry,
): Set<string> {
  return new Set(
    [token, candidate.matchedKey, lexiconEntry?.zh]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  )
}

function scoreCandidate(
  token: string,
  candidate: Candidate,
  lexiconEntry: LexiconLikeEntry,
): number {
  const base = MATCH_STAGE_SCORE[candidate.matchType]
  const excludedTokens = new Set(parseHintList(candidate.pictogram.disambiguationHints.excludeTokens))
  const exclusionTerms = buildExclusionTerms(token, candidate, lexiconEntry)

  for (const term of exclusionTerms) {
    if (excludedTokens.has(term)) {
      return Number.NEGATIVE_INFINITY
    }
  }

  let score = base

  if (candidate.matchType === 'partial') {
    score += candidate.matchedLabelLength ?? 0
  }

  if (lexiconEntry?.category) {
    const domain = getSemanticDomain(candidate.pictogram)
    if (domain === lexiconEntry.category) {
      score += DOMAIN_MATCH_BONUS
    }
  }

  return score
}

function pickBestCandidate(
  token: string,
  candidates: Candidate[],
  lexiconEntry: LexiconLikeEntry,
): Candidate | null {
  let best: Candidate | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const candidate of candidates) {
    const score = scoreCandidate(token, candidate, lexiconEntry)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return bestScore === Number.NEGATIVE_INFINITY ? null : best
}

export interface MatchedToken {
  /** 原始分词 */
  token: string
  /** 匹配到的图片条目，null = 未匹配 */
  pictogram: PictogramEntry | null
  /** 匹配方式 */
  matchType: 'exact' | 'synonym' | 'lexicon-synonym' | 'partial' | 'none'
}

export interface TextToImageMatchResult {
  /** 输入文本 */
  inputText: string
  /** 分词结果 */
  segmentation: SegmentResult
  /** 每个 token 的匹配结果 */
  matches: MatchedToken[]
  /** 匹配成功率 (0-1) */
  matchRate: number
  /** 耗时 (ms) */
  elapsedMs: number
}

export interface MatchTextOptions {
  /**
   * 跳过 segmentText()，直接使用传入的 token 列表。
   * 用于 AI 辅助重分词：LLM 返回的词序列直接进入匹配管线。
   */
  preSegmented?: string[]
}

interface TokenMatch {
  pictogram: PictogramEntry | null
  matchType: MatchedToken['matchType']
}

/** 对单个 token 执行 5 级匹配，返回命中的图符与匹配方式（未命中则 pictogram=null）。 */
function matchToken(token: string, allPictograms: PictogramEntry[]): TokenMatch {
  let matched: PictogramEntry | null = null
  let matchType: MatchedToken['matchType'] = 'none'
  const lexiconEntry = normalizeLexiconEntry(findEntry(token))

  // Strategy 1: 精确匹配 labels.zh，同阶段允许用 category / exclusion 做重排
  const exactCandidate = pickBestCandidate(
    token,
    allPictograms
      .filter((p) => p.labels.zh.some((label) => label === token))
      .map((p) => ({ pictogram: p, matchType: 'exact' as const, matchedKey: token })),
    lexiconEntry,
  )
  if (exactCandidate) {
    matched = exactCandidate.pictogram
    matchType = exactCandidate.matchType
  }

  // Strategy 2: 匹配 synonyms，同阶段允许 exclusion 拦截错误候选
  if (!matched) {
    const synonymCandidate = pickBestCandidate(
      token,
      allPictograms
        .filter((p) => p.synonyms.includes(token))
        .map((p) => ({ pictogram: p, matchType: 'synonym' as const, matchedKey: token })),
      lexiconEntry,
    )
    if (synonymCandidate) {
      matched = synonymCandidate.pictogram
      matchType = synonymCandidate.matchType
    }
  }

  // Strategy 3: 通过 lexicon 查找同义词的主词，再匹配
  if (!matched) {
    if (lexiconEntry) {
      const lexiconCandidate = pickBestCandidate(
        token,
        allPictograms
          .filter((p) => p.labels.zh.some((label) => label === lexiconEntry.zh))
          .map((p) => ({ pictogram: p, matchType: 'lexicon-synonym' as const, matchedKey: lexiconEntry.zh })),
        lexiconEntry,
      )
      if (lexiconCandidate) {
        matched = lexiconCandidate.pictogram
        matchType = lexiconCandidate.matchType
      }
    }
  }

  // Strategy 4: 包含匹配 — token 内含有某个 label（label ≥ 2 字），取最长命中
  // 安全限制：跳过否定前缀词（"不开心" 不应匹配 "开心"）
  if (!matched && token.length >= 3 && !NEGATION_PREFIXES.some((p) => token.startsWith(p))) {
    const partialCandidates: Candidate[] = []
    for (const p of allPictograms) {
      let bestLabelLength = 0
      for (const label of p.labels.zh) {
        if (label.length >= 2 && token.includes(label) && label.length > bestLabelLength) {
          bestLabelLength = label.length
        }
      }
      if (bestLabelLength > 0) {
        partialCandidates.push({
          pictogram: p,
          matchType: 'partial',
          matchedKey: p.labels.zh.find((label) => label.length === bestLabelLength && token.includes(label)) ?? token,
          matchedLabelLength: bestLabelLength,
        })
      }
    }
    const partialCandidate = pickBestCandidate(token, partialCandidates, lexiconEntry)
    if (partialCandidate) {
      matched = partialCandidate.pictogram
      matchType = partialCandidate.matchType
    }
  }

  return { pictogram: matched, matchType }
}

/**
 * 将文本转换为图片序列。
 *
 * 匹配策略：
 * 1. 用 token 精确匹配 pictogram.labels.zh
 * 2. 用 token 匹配 pictogram.synonyms
 * 3. 用 lexicon 查找同义词，再匹配 pictogram.labels.zh
 * 4. 包含匹配：token 包含某个 label（label ≥ 2 字），取最长匹配
 * 5. 都没有 → matchType = 'none'
 *
 * 当 `options.preSegmented` 存在时，跳过分词步骤直接使用该词列表。
 */
export async function matchTextToImages(
  text: string,
  options?: MatchTextOptions,
): Promise<TextToImageMatchResult> {
  const startTime = Date.now()

  const segmentation: SegmentResult = options?.preSegmented
    ? { segments: options.preSegmented, engine: 'intl-segmenter' }
    : segmentText(text)

  // P1 预处理：先合成否定复合词（防"不+X"拆出正面词导致语义反转），再剔除功能词。
  segmentation.segments = mergeNegation(segmentation.segments).filter((t) => !FUNCTION_WORDS.has(t))

  const matches: MatchedToken[] = []

  // 预加载所有图片条目（MVP 数据量小，全加载可行）
  const allPictograms = getAllPictograms()

  for (const token of segmentation.segments) {
    // P1 贪心拆解：token 未命中且图库能从中拆出多个词时，拆成各图库词再匹配。
    // 仅作用于 none token，已命中的（含合规整体图）一律不拆，避免引入粒度回归。
    const pieces = (() => {
      if (matchToken(token, allPictograms).pictogram) return [token]
      const subs = splitByLexicon(token, 4)
      return subs.length > 1 ? subs : [token]
    })()

    for (const piece of pieces) {
      if (MINOR_WORDS.has(piece) || FUNCTION_WORDS.has(piece)) continue
      const { pictogram, matchType } = matchToken(piece, allPictograms)
      matches.push({ token: piece, pictogram, matchType })
    }
  }

  const matchedCount = matches.filter((m) => m.pictogram !== null).length
  const matchRate = matches.length > 0 ? matchedCount / matches.length : 0
  const elapsedMs = Date.now() - startTime

  return {
    inputText: text,
    segmentation,
    matches,
    matchRate,
    elapsedMs,
  }
}
