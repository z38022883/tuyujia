import { useState } from 'react'
import { speak, stopPlayback } from '@/services/tts'
import { useAppStore } from '@/store/useAppStore'
import type { RehabTaskRecord } from '@/types/rehab'
import type { TaskBodyProps } from './types'

export type FlashState = 'correct' | 'wrong' | null

export interface SubmitOptions {
  /** 反馈展示时长（ms），到时回调 onDone 推进下一题 */
  delay?: number
  /** 静默提交：不弹对/错反馈、不播鼓励语音（星级题/完成记录用） */
  quiet?: boolean
}

/**
 * 题型组件通用提交：锁定重复点击 → 展示对/错反馈（含语音鼓励）→ 延时回调 onDone。
 * 判分口径见 types/rehab.ts 头注释。
 */
export function useSubmit(onDone: TaskBodyProps['onDone']) {
  const [flash, setFlash] = useState<FlashState>(null)
  const [locked, setLocked] = useState(false)
  const settings = useAppStore((s) => s.settings)

  const submit = (partial: Partial<RehabTaskRecord>, opts: SubmitOptions = {}) => {
    if (locked) return
    setLocked(true)
    const { delay = 1300, quiet = false } = opts

    if (quiet) {
      setTimeout(() => onDone(partial), delay)
      return
    }

    const ok = partial.correct !== false
    setFlash(ok ? 'correct' : 'wrong')
    // 鼓励语音打断题干朗读
    stopPlayback()
    speak(ok ? '真棒' : '没关系，慢慢来', settings)
    setTimeout(() => onDone(partial), delay)
  }

  return { flash, locked, submit }
}
