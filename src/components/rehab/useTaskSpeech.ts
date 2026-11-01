import { useCallback, useEffect, useRef } from 'react'
import { speak, stopPlayback } from '@/services/tts'
import { useAppStore } from '@/store/useAppStore'

/**
 * 题干朗读：挂载时自动读一遍（autoPlay），返回 play 供手动重播。
 * 文本变化或组件卸载时停止上一次朗读（tts 服务本身也保证单声道）。
 */
export function useTaskSpeech(text: string, autoPlay = true) {
  const settings = useAppStore((s) => s.settings)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const play = useCallback(() => {
    if (!text) return
    speak(text, settingsRef.current)
  }, [text])

  useEffect(() => {
    if (autoPlay && text) play()
    return () => stopPlayback()
  }, [autoPlay, play, text])

  return { play }
}
