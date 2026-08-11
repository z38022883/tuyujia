import { create } from 'zustand'
import type {
  PictogramEntry,
  Expression,
  SavedPhrase,
  TtsSettings,
  NLGRequest
} from '@/types'
import { storage, STORAGE_KEYS } from '@/services/storage'
import { generateSentences } from '@/services/nlg'
import { speak, stopPlayback as stopTts } from '@/services/tts'
import { callFunction } from '@/services/cloud'
import { getPictogramsByIds } from '@/data'

interface AppState {
  // === 板导航 ===
  activeMode: 'express' | 'receive'
  activeCategoryId: string
  categoryPath: string[]

  // === 选择栏 ===
  selectedPictograms: PictogramEntry[]

  // === 候选句 ===
  candidateSentences: string[]
  isGenerating: boolean
  showCandidatePanel: boolean

  // === 播报 ===
  showPlayback: boolean
  playbackSentence: string

  // === 抽屉 ===
  showSavedPhrases: boolean
  showSettings: boolean
  showHistory: boolean

  // === 持久化数据 ===
  expressions: Expression[]
  savedPhrases: SavedPhrase[]
  settings: TtsSettings

  // === Actions: 导航 ===
  openCategory: (id: string) => void
  goBackCategory: () => void
  goRootCategory: () => void
  setActiveMode: (mode: 'express' | 'receive') => void

  // === Actions: 选择 ===
  addPictogram: (p: PictogramEntry) => void
  removePictogram: (index: number) => void
  reorderPictograms: (from: number, to: number) => void
  clearSelection: () => void

  // === Actions: 候选句 / 朗读 ===
  generateAndShowCandidates: () => Promise<void>
  pickCandidate: (sentence: string) => void
  speakSentence: (sentence: string, pictogramIds?: string[]) => Promise<void>
  stopPlayback: () => void
  setShowCandidatePanel: (v: boolean) => void

  // === Actions: 抽屉 ===
  setShowSavedPhrases: (v: boolean) => void
  setShowSettings: (v: boolean) => void
  setShowHistory: (v: boolean) => void

  // === Actions: 收藏 / 历史 ===
  saveCurrentAsPhrase: () => SavedPhrase | null
  deletePhrase: (id: string) => void
  deleteExpression: (id: string) => void
  playPhrase: (phrase: SavedPhrase) => Promise<void>
  recordReceiveExpression: (inputText: string, pictograms: PictogramEntry[]) => void

  // === Actions: 设置 ===
  updateSettings: (s: Partial<TtsSettings>) => void
  loadLocalData: () => void
  setExpressions: (list: Expression[]) => void
  setSavedPhrases: (list: SavedPhrase[]) => void
}

const defaultSettings: TtsSettings = {
  rate: 1,
  voiceName: '',
  autoSpeak: false
}

let sessionIdCounter = 0
function newSessionId(): string {
  sessionIdCounter += 1
  return `s_${Date.now()}_${sessionIdCounter}`
}

export const useAppStore = create<AppState>((set, get) => ({
  activeMode: 'express',
  activeCategoryId: 'root',
  categoryPath: [],
  selectedPictograms: [],
  candidateSentences: [],
  isGenerating: false,
  showCandidatePanel: false,
  showPlayback: false,
  playbackSentence: '',
  showSavedPhrases: false,
  showSettings: false,
  showHistory: false,
  expressions: [],
  savedPhrases: [],
  settings: defaultSettings,

  openCategory: (id) =>
    set((state) => ({
      activeCategoryId: id,
      categoryPath:
        state.activeCategoryId === id
          ? state.categoryPath
          : [...state.categoryPath, state.activeCategoryId]
    })),
  goBackCategory: () =>
    set((state) => {
      const nextPath = state.categoryPath.slice(0, -1)
      return {
        activeCategoryId: state.categoryPath.at(-1) ?? 'root',
        categoryPath: nextPath
      }
    }),
  goRootCategory: () => set({ activeCategoryId: 'root', categoryPath: [] }),
  setActiveMode: (mode) => set({ activeMode: mode }),

  addPictogram: (p) =>
    set((state) => ({
      selectedPictograms: [...state.selectedPictograms, p],
      candidateSentences: []
    })),
  removePictogram: (index) =>
    set((state) => ({
      selectedPictograms: state.selectedPictograms.filter((_, i) => i !== index),
      candidateSentences: []
    })),
  reorderPictograms: (from, to) =>
    set((state) => {
      const items = [...state.selectedPictograms]
      const [moved] = items.splice(from, 1)
      items.splice(to, 0, moved)
      return { selectedPictograms: items, candidateSentences: [] }
    }),
  clearSelection: () =>
    set({
      selectedPictograms: [],
      candidateSentences: [],
      showCandidatePanel: false
    }),

  generateAndShowCandidates: async () => {
    const { selectedPictograms } = get()
    if (selectedPictograms.length === 0 || get().isGenerating) return
    set({ isGenerating: true })
    try {
      const req: NLGRequest = {
        pictogramLabels: selectedPictograms.map((p) => p.labels.zh[0]),
        candidateCount: 5
      }
      const res = await generateSentences(req)
      set({
        candidateSentences: res.candidates,
        showCandidatePanel: true,
        isGenerating: false
      })
    } catch (err) {
      console.error('[Store] generate candidates failed:', err)
      set({ isGenerating: false })
    }
  },

  pickCandidate: (sentence) => {
    get().speakSentence(sentence)
    set({ showCandidatePanel: false })
  },

  speakSentence: async (sentence, pictogramIds = []) => {
    set({ showPlayback: true, playbackSentence: sentence })
    // 记录表达历史
    const { selectedPictograms, expressions } = get()
    const expr: Expression = {
      id: `e_${Date.now()}`,
      sessionId: newSessionId(),
      direction: 'express',
      pictogramIds: pictogramIds.length
        ? pictogramIds
        : selectedPictograms.map((p) => p.id),
      pictogramLabels: pictogramIds.length
        ? getPictogramsByIds(pictogramIds).map((p) => p.labels.zh[0])
        : selectedPictograms.map((p) => p.labels.zh[0]),
      candidateSentences: get().candidateSentences,
      selectedSentence: sentence,
      createdAt: Date.now(),
      isFavorite: false
    }
    const nextExpressions = [expr, ...expressions].slice(0, 200)
    set({ expressions: nextExpressions })
    storage.set(STORAGE_KEYS.expressions, nextExpressions)
    callFunction('saveExpression', { expression: expr }).catch((err) =>
      console.error('[Store] sync expression:', err)
    )
    // 朗读
    try {
      await speak(sentence, get().settings)
    } catch (err) {
      console.error('[Store] speak:', err)
    } finally {
      set({ showPlayback: false })
    }
  },

  stopPlayback: () => {
    stopTts()
    set({ showPlayback: false, playbackSentence: '' })
  },
  setShowCandidatePanel: (v) => set({ showCandidatePanel: v }),

  setShowSavedPhrases: (v) => set({ showSavedPhrases: v }),
  setShowSettings: (v) => set({ showSettings: v }),
  setShowHistory: (v) => set({ showHistory: v }),

  saveCurrentAsPhrase: () => {
    const { selectedPictograms, savedPhrases } = get()
    if (!selectedPictograms.length) return null
    const sentence = selectedPictograms.map((p) => p.labels.zh[0]).join('')
    const phrase: SavedPhrase = {
      id: `s_${Date.now()}`,
      sentence,
      pictogramIds: selectedPictograms.map((p) => p.id),
      usageCount: 0,
      createdAt: Date.now(),
      lastUsedAt: Date.now()
    }
    const next = [phrase, ...savedPhrases]
    set({ savedPhrases: next })
    storage.set(STORAGE_KEYS.savedPhrases, next)
    callFunction('savePhrase', { phrase }).catch((err) =>
      console.error('[Store] sync phrase:', err)
    )
    return phrase
  },

  deletePhrase: (id) => {
    const next = get().savedPhrases.filter((p) => p.id !== id)
    set({ savedPhrases: next })
    storage.set(STORAGE_KEYS.savedPhrases, next)
    callFunction('deletePhrase', { id }).catch((err) =>
      console.error('[Store] sync delete phrase:', err)
    )
  },

  deleteExpression: (id) => {
    const next = get().expressions.filter((e) => e.id !== id)
    set({ expressions: next })
    storage.set(STORAGE_KEYS.expressions, next)
  },

  recordReceiveExpression: (inputText, pictograms) => {
    const expr: Expression = {
      id: `e_${Date.now()}`,
      sessionId: newSessionId(),
      direction: 'receive',
      pictogramIds: pictograms.map((p) => p.id),
      pictogramLabels: pictograms.map((p) => p.labels.zh[0]),
      candidateSentences: [],
      selectedSentence: null,
      inputText,
      createdAt: Date.now(),
      isFavorite: false
    }
    const nextExpressions = [expr, ...get().expressions].slice(0, 200)
    set({ expressions: nextExpressions })
    storage.set(STORAGE_KEYS.expressions, nextExpressions)
    callFunction('saveExpression', { expression: expr }).catch((err) =>
      console.error('[Store] sync receive expression:', err)
    )
  },

  playPhrase: async (phrase) => {
    const pictos = getPictogramsByIds(phrase.pictogramIds)
    set({ selectedPictograms: pictos })
    await get().speakSentence(phrase.sentence, phrase.pictogramIds)
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial }
    set({ settings })
    storage.set(STORAGE_KEYS.settings, settings)
  },

  loadLocalData: () => {
    const settings = storage.get<TtsSettings>(STORAGE_KEYS.settings, defaultSettings)
    const expressions = storage.get<Expression[]>(STORAGE_KEYS.expressions, [])
    const savedPhrases = storage.get<SavedPhrase[]>(STORAGE_KEYS.savedPhrases, [])
    set({ settings, expressions, savedPhrases })
  },

  setExpressions: (list) => set({ expressions: list }),
  setSavedPhrases: (list) => set({ savedPhrases: list })
}))
