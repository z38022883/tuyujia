// ===== 语音合成服务：文本 → 语音播放（h5 走浏览器 SpeechSynthesis，微信端走云函数）=====
// 微信端播放通道带本地 LRU 音频缓存：
//   合成结果按 hash(voice|rate|text) 落盘 tts-cache/（索引存 Storage，预算 64 条 / 8MB），
//   同句第二次起直接本地播放（AAC 高频短句基本秒出声），超限按最久未用淘汰。
//   prewarmTts 供启动后后台预合成高频预设句，顺带预热云函数冷启动。
import Taro from '@tarojs/taro'
import { callFunction } from './cloud'
import { storage, STORAGE_KEYS } from './storage'
import type { TtsSettings } from '@/types'

/**
 * 朗读文本。
 * - h5 预览：浏览器 SpeechSynthesis（真实发声）
 * - weapp：缓存命中直接播；未命中走云函数 textToSpeech（腾讯云 TTS 合成 mp3）
 *   → 写缓存文件 → InnerAudioContext 播放；合成失败自动降级为 toast 提示（不白屏）
 */

const isH5 = process.env.TARO_ENV === 'h5'
const isWeapp = process.env.TARO_ENV === 'weapp'

/** 与服务端基础语音合成单次上限保持一致 */
const MAX_TEXT_LENGTH = 150

// ===== 本地音频缓存（LRU）=====
const TTS_CACHE_DIR = `${(Taro.env as any).USER_DATA_PATH || ''}/tts-cache`
const TTS_CACHE_MAX_ENTRIES = 64
const TTS_CACHE_MAX_BYTES = 8 * 1024 * 1024

interface TtsCacheEntry {
  file: string
  size: number
  usedAt: number
}

type TtsCacheIndex = Record<string, TtsCacheEntry>

let cacheIndex: TtsCacheIndex | null = null

interface TtsAudioResult {
  audioBase64: string
  codec?: string
  truncated?: boolean
}

interface ActivePlayback {
  stop: () => void
  /** 命中/写入缓存时记录 key，LRU 淘汰时跳过正在播放的条目 */
  cacheKey?: string
}

let activePlayback: ActivePlayback | null = null

function userDataPath(): string {
  return (Taro.env as any).USER_DATA_PATH || ''
}

/** 停止并清理上一次播放（同一时刻只允许一路声音） */
function clearActivePlayback(): void {
  if (activePlayback) {
    const p = activePlayback
    activePlayback = null
    try {
      p.stop()
    } catch {
      // ignore
    }
  }
}

// ===== 缓存读写 =====

/** djb2 哈希（语音参数 + 文本）→ 短文件名安全串；文本长度入 key 进一步降低碰撞面 */
function ttsCacheKey(text: string, voiceName: string, rate: number): string {
  const s = `${voiceName}|${rate}|${text}`
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return `${(h >>> 0).toString(36)}_${s.length}`
}

function loadCacheIndex(): TtsCacheIndex {
  if (!cacheIndex) {
    cacheIndex = storage.get<TtsCacheIndex>(STORAGE_KEYS.ttsCacheIndex, {})
  }
  return cacheIndex
}

function saveCacheIndex(): void {
  if (cacheIndex) storage.set(STORAGE_KEYS.ttsCacheIndex, cacheIndex)
}

function ensureCacheDir(): boolean {
  try {
    Taro.getFileSystemManager().mkdirSync(TTS_CACHE_DIR, true)
  } catch {
    // 目录已存在等情况，忽略
  }
  return true
}

/** 查缓存：命中返回文件路径并刷新 LRU；文件丢失则清理索引返回 null */
function getCachedAudio(key: string): string | null {
  const idx = loadCacheIndex()
  const entry = idx[key]
  if (!entry) return null
  try {
    Taro.getFileSystemManager().accessSync(entry.file)
    entry.usedAt = Date.now()
    saveCacheIndex()
    return entry.file
  } catch {
    delete idx[key]
    saveCacheIndex()
    return null
  }
}

/** 写缓存（base64 音频落盘 + 更新索引 + 超限 LRU 淘汰）；失败返回 null，调用方降级临时文件 */
function putCachedAudio(key: string, base64: string, ext: string): string | null {
  try {
    ensureCacheDir()
    const fs = Taro.getFileSystemManager()
    const filePath = `${TTS_CACHE_DIR}/t_${key}.${ext}`
    fs.writeFileSync(filePath, base64, 'base64')
    const idx = loadCacheIndex()
    // base64 → 二进制约 3/4 体积
    idx[key] = { file: filePath, size: Math.floor((base64.length * 3) / 4), usedAt: Date.now() }
    evictCacheLRU(idx)
    saveCacheIndex()
    return filePath
  } catch (err) {
    console.warn('[TTS] cache write failed:', err)
    return null
  }
}

/** 超预算（条数/体积）时按 usedAt 从旧到新淘汰（当前正在播放的条目跳过） */
function evictCacheLRU(idx: TtsCacheIndex): void {
  const playing = activePlayback?.cacheKey ?? null
  const entries = Object.entries(idx).sort((a, b) => a[1].usedAt - b[1].usedAt)
  let total = entries.reduce((sum, [, e]) => sum + e.size, 0)
  for (const [key, entry] of entries) {
    if (key === playing) continue
    if (Object.keys(idx).length <= TTS_CACHE_MAX_ENTRIES && total <= TTS_CACHE_MAX_BYTES) break
    try {
      Taro.getFileSystemManager().unlinkSync(entry.file)
    } catch {
      // 文件可能已被清理，忽略
    }
    delete idx[key]
    total -= entry.size
  }
}

// ===== 播放 =====

/**
 * 朗读文本（增：向播放通道提交一段新的合成播放任务，同时只允许一路声音）。
 * 输入：text – 待朗读文本（空串直接返回）；settings – TtsSettings
 *       { rate: number  // 语速 0.5~2
 *         voiceName: string  // 音色（'female' | 'male'，微信端传给云函数）
 *         autoSpeak: boolean }  // 是否自动朗读（本函数不消费）
 * 输出：Promise<void> – 播放结束（或失败降级 toast）后 resolve
 */
export function speak(text: string, settings: TtsSettings): Promise<void> {
  if (!text) return Promise.resolve()
  if (isH5) return speakWithBrowser(text, settings)
  if (isWeapp) return speakWithCloud(text, settings)
  return Promise.resolve()
}

/**
 * 预热（增：后台顺序预合成文本列表并写缓存，顺带预热云函数冷启动）。
 * 输入：texts – 待预合成文本（截断到 150 字，去空后最多 12 条）；settings – 当前 TtsSettings
 * 输出：无。副作用：合成结果写本地缓存；失败静默（不打断 UI，连续失败即中止本次预热）
 */
export function prewarmTts(texts: string[], settings: TtsSettings): void {
  if (!isWeapp) return
  const list = Array.from(
    new Set(
      texts
        .map((t) => (typeof t === 'string' ? t.trim().slice(0, MAX_TEXT_LENGTH) : ''))
        .filter(Boolean)
    )
  ).slice(0, 12)
  if (!list.length) return

  const voiceName = settings.voiceName || 'female'
  const rate = settings.rate
  ;(async () => {
    for (const text of list) {
      if (getCachedAudio(ttsCacheKey(text, voiceName, rate))) continue
      try {
        const res = await callFunction<TtsAudioResult>('textToSpeech', {
          text,
          voiceName,
          rate
        })
        if (!res || !res.audioBase64) continue
        putCachedAudio(ttsCacheKey(text, voiceName, rate), res.audioBase64, codecExt(res.codec))
      } catch (err) {
        console.warn('[TTS] prewarm stopped:', err)
        return // 云函数不可用（弱网/未部署）时中止预热，避免连环失败
      }
    }
    console.info('[TTS] prewarm done:', list.length, 'texts')
  })()
}

function speakWithBrowser(text: string, settings: TtsSettings): Promise<void> {
  return new Promise((resolve) => {
    try {
      const w = window as any
      const synth = w.speechSynthesis
      if (!synth) {
        resolve()
        return
      }
      synth.cancel()

      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        if (activePlayback === playback) activePlayback = null
        resolve()
      }

      const playback: ActivePlayback = {
        stop: () => {
          try {
            synth.cancel()
          } catch {
            // ignore
          }
        }
      }
      activePlayback = playback

      const utter = new w.SpeechSynthesisUtterance(text)
      utter.lang = 'zh-CN'
      utter.rate = settings.rate
      utter.onend = finish
      utter.onerror = finish
      synth.speak(utter)
    } catch (err) {
      console.error('[TTS] h5 speech failed:', err)
      resolve()
    }
  })
}

function codecExt(codec?: string): string {
  return codec === 'wav' ? 'wav' : codec === 'pcm' ? 'pcm' : 'mp3'
}

function speakWithCloud(text: string, settings: TtsSettings): Promise<void> {
  // 与服务端一致：截断到 150 字符
  const finalText = text.slice(0, MAX_TEXT_LENGTH)
  const voiceName = settings.voiceName || 'female'

  return new Promise((resolve) => {
    let settled = false
    let ctx: ReturnType<typeof Taro.createInnerAudioContext> | null = null
    let tempFilePath = '' // 仅缓存写入失败时的降级临时文件，播放后清理

    const finish = () => {
      if (settled) return
      settled = true
      if (activePlayback === playback) activePlayback = null
      try {
        ctx?.destroy()
      } catch {
        // ignore
      }
      removeTempFile(tempFilePath)
      resolve()
    }

    // 打断上一次播放后再开始新的
    clearActivePlayback()
    const playback: ActivePlayback = {
      stop: () => {
        try {
          ctx?.stop()
        } catch {
          // ignore
        }
        finish()
      }
    }
    activePlayback = playback

    const play = (filePath: string) => {
      const audio = Taro.createInnerAudioContext()
      ctx = audio
      // AAC 场景：手机静音键下也要能发声
      audio.obeyMuteSwitch = false
      audio.src = filePath
      audio.onEnded(finish)
      audio.onStop(finish)
      audio.onError((err) => {
        console.error('[TTS] weapp play error:', err)
        finish()
      })
      audio.play()
    }

    const cacheKey = ttsCacheKey(finalText, voiceName, settings.rate)
    const cached = getCachedAudio(cacheKey)
    if (cached) {
      playback.cacheKey = cacheKey
      play(cached)
      return
    }

    ;(async () => {
      try {
        const res = await callFunction<TtsAudioResult>('textToSpeech', {
          text: finalText,
          voiceName,
          rate: settings.rate
        })
        if (!res || !res.audioBase64) {
          throw new Error('empty audio from textToSpeech')
        }
        const ext = codecExt(res.codec)
        const cachedPath = putCachedAudio(cacheKey, res.audioBase64, ext)
        if (cachedPath) {
          playback.cacheKey = cacheKey
          play(cachedPath)
        } else {
          // 缓存写失败（磁盘满等）：退回临时文件播放，播完清理
          tempFilePath = writeBase64TempFile(res.audioBase64, ext)
          play(tempFilePath)
        }
      } catch (err) {
        console.error('[TTS] weapp synth failed, fallback to toast:', err)
        // 合成失败降级：保持原来的 toast 演示，不打断整体流程
        Taro.showToast({ title: `🔊 ${finalText}`, icon: 'none', duration: 1500 })
        setTimeout(finish, 1500)
      }
    })()
  })
}

/** base64 音频写入本地临时文件，返回可播放路径（仅缓存写入失败时的降级通道） */
function writeBase64TempFile(base64: string, ext: string): string {
  const fs = Taro.getFileSystemManager()
  const filePath = `${userDataPath()}/tts_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`
  fs.writeFileSync(filePath, base64, 'base64')
  return filePath
}

function removeTempFile(filePath: string): void {
  if (!filePath) return
  try {
    Taro.getFileSystemManager().unlinkSync(filePath)
  } catch {
    // 文件可能已被清理，忽略
  }
}

/** 停止朗读（删：终止当前播放；缓存文件保留供下次秒播；h5 与 weapp 均生效） */
export function stopPlayback(): void {
  clearActivePlayback()
  if (isH5) {
    try {
      const w = window as any
      w.speechSynthesis?.cancel()
    } catch {
      // ignore
    }
  }
}
