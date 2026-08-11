import type { NLGProvider, NLGRequest, NLGResponse } from '@/types'
import { callFunction } from './cloud'

/** 主语（从长到短，避免短前缀误匹配） */
const SUBJECT_PRONOUNS = ['我们', '你们', '他们', '她们', '我', '你', '他', '她', '它']
/** 常见意愿动词（从长到短） */
const DESIRE_VERBS = ['想要', '需要', '希望', '想', '要']
const POLITE_PREFIX = '请'

function startsWithAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.startsWith(p))
}
function containsAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p))
}

/**
 * 离线模板拼句 — 永远可用的兜底 NLG（迁移自原版 template-nlg.ts）。
 * 生成策略：原句 / 加主语 / 加「我想要」/ 礼貌形式 / 疑问形式
 */
export class TemplateNLG implements NLGProvider {
  readonly name = 'template'

  async generate(req: NLGRequest): Promise<NLGResponse> {
    const labels = req.pictogramLabels
    if (labels.length === 0) {
      return {
        candidates: ['（请先选择图片）'],
        provider: this.name,
        isOfflineFallback: true
      }
    }

    const base = labels.join('')
    const hasSubject = startsWithAny(base, SUBJECT_PRONOUNS)
    const hasDesire = containsAny(base, DESIRE_VERBS)
    const isPoliteAlready = base.startsWith(POLITE_PREFIX)

    const raw: string[] = []
    raw.push(base + '。')
    if (!hasSubject) raw.push('我' + base + '。')
    if (!hasSubject && !hasDesire) raw.push('我想要' + base + '。')
    if (!isPoliteAlready && !hasSubject) raw.push(POLITE_PREFIX + base + '。')
    raw.push(base + '，好吗？')

    const seen = new Set<string>()
    const candidates = raw.filter((s) => {
      if (seen.has(s)) return false
      seen.add(s)
      return true
    })

    return {
      candidates: candidates.slice(0, req.candidateCount),
      provider: this.name,
      isOfflineFallback: true
    }
  }
}

const template = new TemplateNLG()

/**
 * 生成候选句。微信端优先调用云端 LLM（aiSentences 云函数），失败降级模板；
 * H5 预览直接用模板（无需后端即可体验选句流程）。
 */
export async function generateSentences(req: NLGRequest): Promise<NLGResponse> {
  if (process.env.TARO_ENV === 'weapp') {
    try {
      const res = await callFunction<NLGResponse>('aiSentences', { request: req })
      if (res?.candidates?.length) return res
    } catch (err) {
      console.error('[NLG] cloud failed, fallback to template:', err)
    }
  }
  return template.generate(req)
}
