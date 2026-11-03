/**
 * 首选图目检不合格的词 → 拉取全部/前N候选图做人工比对（一次性辅助脚本，配合 probe-tcm-pictograms.mjs）。
 * 用法：node scripts/golden/probe-tcm-alternates.mjs
 * 输出：.tmp-tcm-img/alt_<词>_<检索词#序号>_<id>.png + 候选清单 stdout
 */
import fs from 'node:fs'

const DIR = 'D:/projects/tuyujia/.tmp-tcm-img'

const ALT = [
  { key: '膝盖', terms: [['en', 'knee'], ['zh', '膝关节']] },
  { key: '推拿', terms: [['en', 'massage'], ['zh', '按摩']] },
  { key: '把脉', terms: [['zh', '脉搏'], ['en', 'blood pressure']] },
  { key: '热敷', terms: [['en', 'heating pad'], ['zh', '敷'], ['en', 'compress']] },
  { key: '拔罐', terms: [['zh', '罐'], ['en', 'cupping therapy'], ['en', 'cup']] },
  { key: '心慌', terms: [['en', 'heart'], ['zh', '心脏']] },
  { key: '中药', terms: [['en', 'mortar'], ['en', 'medicinal plants']] },
  { key: '艾灸', terms: [['en', 'moxa'], ['zh', '艾'], ['en', 'burning']] }
]

const TOP = 4

async function search(lang, word) {
  try {
    const res = await fetch(`https://api.arasaac.org/api/pictograms/${lang}/search/${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return []
    const a = await res.json()
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

for (const { key, terms } of ALT) {
  console.log(`\n== ${key} ==`)
  let idx = 0
  for (const [lang, term] of terms) {
    const arr = await search(lang, term)
    const sorted = [...arr].sort((a, b) => (b.schematic === true) - (a.schematic === true))
    console.log(`  ${lang}:${term} -> ${arr.length} hits`)
    for (const p of sorted.slice(0, TOP)) {
      idx++
      const file = `${DIR}/alt_${key}_${lang}${idx}_${p._id}.png`
      const url = `https://static.arasaac.org/pictograms/${p._id}/${p._id}_300.png`
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
        if (res.ok) fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
        console.log(`    ${lang}${idx} #${p._id} schematic=${p.schematic === true} -> ${file} ${res.ok ? 'ok' : 'DL_FAIL'}`)
      } catch {
        console.log(`    ${lang}${idx} #${p._id} DL_TIMEOUT`)
      }
    }
  }
}
console.log('\n完成')
