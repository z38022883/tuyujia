import type { RehabLevel, RehabTask, RehabTaskRecord } from '@/types/rehab'

/** 题型组件统一 props：完成本题时调 onDone（可携带判分/星级/作答摘要） */
export interface TaskBodyProps {
  task: RehabTask
  level: RehabLevel
  onDone: (partial?: Partial<RehabTaskRecord>) => void
}
