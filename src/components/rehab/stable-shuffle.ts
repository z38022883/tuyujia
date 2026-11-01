/** 按字符串种子稳定洗牌：同一 key 每次结果一致（重进同题选项不换位） */
export function stableShuffle<T>(list: T[], key: string): T[] {
  let a = [...key].reduce((n, c) => n + c.charCodeAt(0) * 31, 7) >>> 0
  const rand = () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
