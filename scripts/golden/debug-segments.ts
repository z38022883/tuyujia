/**
 * 临时调试：打印指定句子的 segments 与 matches，定位 p_come / p_i 来源。
 */
import { matchTextToImages } from '../../src/utils/text-to-image-matcher'

async function main() {
  const sentences = ['坐下来', '把手抬起来', '我们要去医院', '医生来看你了', '需要喝水吗', '你头疼吗', '该吃饭了']
  for (const s of sentences) {
    const r = await matchTextToImages(s)
    console.log('===', s, '===')
    console.log('segments:', JSON.stringify(r.segmentation.segments))
    console.log(
      'matches:',
      JSON.stringify(
        r.matches.map((m) => ({
          token: m.token,
          type: m.matchType,
          pic: m.pictogram ? `${m.pictogram.id}(${m.pictogram.labels.zh.join('/')})` : null,
        })),
      ),
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
