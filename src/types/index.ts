// 图语家核心类型（迁移自原版 picinterpreter src/types/index.ts）

// ===== 图库相关 =====

export type BoardTile =
  | { type: 'pictogram'; id: string; labelOverride?: string }
  | { type: 'category'; id: string; labelOverride?: string }
  | { type: 'savedPhrases'; id: 'saved-phrases'; labelOverride?: string }
  | { type: 'recent'; id: 'recent'; labelOverride?: string }

/** 图片分类（即"板/board"，patient 端的展示单元） */
export interface Category {
  id: string
  name: string
  icon: string
  sortOrder: number
  linkedCategoryIds?: string[]
  tileIds?: string[]
  tiles?: BoardTile[]
  hidden?: boolean
}

/** 图片条目 */
export interface PictogramEntry {
  id: string
  imageUrl: string
  labels: {
    zh: string[]
    en: string[]
  }
  categoryId: string
  categoryIds?: string[]
  synonyms: string[]
  relatedTerms?: string[]
  disambiguationHints: Record<string, string>
  emotionTag?: string
  source?: PictogramSource
  manualOrder?: number
  usageCount: number
  lastUsedAt?: number
}

export interface PictogramSource {
  provider: 'arasaac' | 'opensymbols'
  name: string
  originalId: string
  license: string
  licenseUrl?: string | null
  author?: string | null
  authorUrl?: string | null
  sourceUrl?: string | null
  repoKey?: string | null
}

// ===== 表达相关 =====

export interface Expression {
  id: string
  sessionId: string
  direction: 'express' | 'receive'
  pictogramIds: string[]
  pictogramLabels: string[]
  candidateSentences: string[]
  selectedSentence: string | null
  inputText?: string
  createdAt: number
  updatedAt?: number
  isFavorite: boolean
}

/** 常用表达（收藏） */
export interface SavedPhrase {
  id: string
  sentence: string
  pictogramIds: string[]
  usageCount: number
  createdAt?: number
  lastUsedAt: number
}

// ===== Provider 类型 =====

export interface NLGRequest {
  pictogramLabels: string[]
  context?: {
    recentSentences?: string[]
    scene?: string
    pictogramVocabulary?: string
  }
  candidateCount: number
}

export interface NLGResponse {
  candidates: string[]
  provider: string
  isOfflineFallback: boolean
}

export interface NLGProvider {
  readonly name: string
  generate(req: NLGRequest): Promise<NLGResponse>
}

export interface TtsSettings {
  rate: number
  voiceName: string
  autoSpeak: boolean
}

// ===== Auth（预留，后续接入） =====

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export interface User {
  openid: string
  nickname: string
  avatar: string
}

export interface AuthenticatedUserSummary {
  id: string
  username: string
  phoneMasked: string
}

/** 云函数统一返回格式 */
export interface CloudResult<T = unknown> {
  code: number
  message: string
  data: T
}
