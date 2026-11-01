/**
 * 边界探针：验证图5-1 未覆盖的输入形态在真实管线下的行为。
 * 运行：node -r ts-node/register/transpile-only -r ./scripts/golden/register-alias.cjs scripts/golden/probe-edge-cases.ts
 */
import { matchTextToImages } from '@/utils/text-to-image-matcher'

const CASES = [
  // 图中示例（应正常）
  '我不饿，不要肚子疼，再说一次',
  '你饿不饿',
  '我不开心',
  '需要吃药吗',
  // 探针 1：标点紧跟否定词 → 否定合并是否会吞掉标点
  '我不去。',
  '他没来！',
  '别摔倒。',
  '我不吃药。',
  // 探针 2：单字 A不A 之外的形态
  '我饿不饿',
  '饭好不好吃',
  '水热不热',
  '疼不疼',
  // 探针 3：正反问固定短语后接内容
  '会不会下雨',
  '可不可以坐下',
  // 探针 4：否定 + 标点 + 后续
  '我不饿，不用了。',
]

async function run() {
  for (const s of CASES) {
    const r = await matchTextToImages(s)
    const seg = r.segmentation.segments.join(' | ')
    const out = r.matches
      .map((m) => `${m.token}${m.pictogram ? `→${m.pictogram.id}[${m.matchType}]` : '→∅'}`)
      .join('  ')
    console.log(`\n句：${s}`)
    console.log(`  分词：${seg}`)
    console.log(`  匹配：${out}`)
    console.log(`  matchRate=${r.matchRate.toFixed(3)}  耗时=${r.elapsedMs}ms`)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
