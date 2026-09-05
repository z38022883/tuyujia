import Taro from '@tarojs/taro'
import { callFunction } from './cloud'
import type { TtsSettings } from '@/types'

/**
 * 朗读文本。
 * - h5 预览：浏览器 SpeechSynthesis（真实发声）
 * - weapp：云函数 textToSpeech（腾讯云 TTS 合成 mp3）→ 写本地临时文件 → InnerAudioContext 播放；
 *   合成失败自动降级为 toast 提示（保持原演示行为，不白屏）
 */

const isH5 = process.env.TARO_ENV === 'h5'
const isWeapp = process.env.TARO_ENV === 'weapp'

/** 与服务端基础语音合成单次上限保持一致 */
const MAX_TEXT_LENGTH = 150

interface TtsAudioResult {
  audioBase64: string
  codec?: string
  truncated?: boolean
}

interface ActivePlayback {
  stop: () => void
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

export function speak(text: string, settings: TtsSettings): Promise<void> {
  if (!text) return Promise.resolve()
  if (isH5) return speakWithBrowser(text, settings)
  if (isWeapp) return speakWithCloud(text, settings)
  return Promise.resolve()
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

function speakWithCloud(text: string, settings: TtsSettings): Promise<void> {
  // 与服务端一致：截断到 150 字符
  const finalText = text.slice(0, MAX_TEXT_LENGTH)

  return new Promise((resolve) => {
    let settled = false
    let ctx: ReturnType<typeof Taro.createInnerAudioContext> | null = null
    let filePath = ''

    const finish = () => {
      if (settled) return
      settled = true
      if (activePlayback === playback) activePlayback = null
      try {
        ctx?.destroy()
      } catch {
        // ignore
      }
      removeTempFile(filePath)
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

    ;(async () => {
      try {
        const res = await callFunction<TtsAudioResult>('textToSpeech', {
          text: finalText,
          voiceName: settings.voiceName || 'female',
          rate: settings.rate
        })
        if (!res || !res.audioBase64) {
          throw new Error('empty audio from textToSpeech')
        }
        filePath = writeBase64TempFile(res.audioBase64, res.codec)

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
      } catch (err) {
        console.error('[TTS] weapp synth failed, fallback to toast:', err)
        // 合成失败降级：保持原来的 toast 演示，不打断整体流程
        Taro.showToast({ title: `🔊 ${finalText}`, icon: 'none', duration: 1500 })
        setTimeout(finish, 1500)
      }
    })()
  })
}

/** base64 音频写入本地临时文件，返回可播放路径 */
function writeBase64TempFile(base64: string, codec?: string): string {
  const ext = codec === 'wav' ? 'wav' : codec === 'pcm' ? 'pcm' : 'mp3'
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

/** 停止朗读（h5 与 weapp 均生效） */
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
