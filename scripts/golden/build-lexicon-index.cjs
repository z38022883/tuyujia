/**
 * 从 seed/pictograms.json 导出 "词 → 图符 id 索引"，作为 golden 集标注的参考。
 * 输出：scripts/golden/_lexicon-index.json
 * 用法：node scripts/golden/build-lexicon-index.cjs
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../')
const pictograms = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/seed/pictograms.json'), 'utf8')
)

const catalog = []
for (const p of pictograms) {
  const words = [...new Set([...(p.labels.zh || []), ...(p.synonyms || [])])]
  for (const w of words) {
    if (!w) continue
    catalog.push({
      word: w,
      ids: p.id,
      label: (p.labels.zh || [])[0],
      cat: p.categoryId,
    })
  }
}
catalog.sort((a, b) => a.word.localeCompare(b.word, 'zh-CN'))

// 聚合：word → [ids]
const byWord = new Map()
for (const item of catalog) {
  if (!byWord.has(item.word)) byWord.set(item.word, [])
  byWord.get(item.word).push(item)
}
const index = {}
for (const [word, items] of byWord) {
  index[word] = {
    ids: [...new Set(items.map((i) => i.ids))],
    label: items[0].label,
    cat: items[0].cat,
  }
}

fs.writeFileSync(
  path.join(__dirname, '_lexicon-index.json'),
  JSON.stringify({ count: Object.keys(index).length, index }, null, 2)
)
console.log('exported', Object.keys(index).length, 'words →', path.join(__dirname, '_lexicon-index.json'))