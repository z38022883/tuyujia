import Taro from '@tarojs/taro'
import type { TtsSettings } from '@/types'

/**
 * 朗读文本。
 * - h5 预览：浏览器 SpeechSynthesis
 * - weapp：暂不可用（同声传译插件因账号非开发者无法使用，已停用；TODO 接腾讯云 TTS 插件 / 服务端合成）
 */
export async function speak(text: string, settings: TtsSettings): Promise<void> {
  if (!text) return

  if (process.env.TARO_ENV === 'h5') {
    try {
      const w = window as any
      const synth = w.speechSynthesis
      const utter = new w.SpeechSynthesisUtterance(text)
      utter.lang = 'zh-CN'
      utter.rate = settings.rate
      synth.speak(utter)
    } catch (err) {
      console.error('[TTS] h5 speech failed:', err)
    }
    return
  }

  if (process.env.TARO_ENV === 'weapp') {
    // 微信端兜底：toast 演示，无真实语音
    Taro.showToast({ title: `🔊 ${text}`, icon: 'none', duration: 1500 })
  }
}

/** 停止朗读（h5 有效；微信端为 no-op） */
export function stopPlayback(): void {
  if (process.env.TARO_ENV === 'h5') {
    try {
      const w = window as any
      w.speechSynthesis?.cancel()
    } catch {
      // ignore
    }
  }
}
