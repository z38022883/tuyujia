/**
 * 通用连续天数计算：按时间戳列表统计含今天的连续天数。
 * 今天没有记录则从昨天起算（昨天也没有即为 0）。
 * 与 useTcmStore.calcStreakDays 同一算法，泛化到任意时间戳（如训练会话完成时间）。
 */
export function streakDaysFromTimestamps(timestamps: number[]): number {
  if (!timestamps.length) return 0

  const dayKey = (ts: number) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  }

  const days = new Set(timestamps.map(dayKey))
  let streak = 0
  const cursor = new Date()
  // 若今天没有记录，从昨天起算
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(dayKey(cursor.getTime()))) return 0
  }
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
