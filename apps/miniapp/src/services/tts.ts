import Taro from '@tarojs/taro'
import type { TtsSettings } from '@/types'

/**
 * 朗读文本。
 * - h5 预览：浏览器 SpeechSynthesis
 * - weapp：占位 toast（TODO: 接入云 TTS / 同声传译插件）
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
    // 微信端兜底：toast 演示。TODO: 替换为腾讯云 TTS 插件 / 服务端合成
    Taro.showToast({ title: `🔊 ${text}`, icon: 'none', duration: 1500 })
  }
}
