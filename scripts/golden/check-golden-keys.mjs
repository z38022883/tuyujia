// 检查 golden 集关键词是否都有对应图符
// 核对三件事：
//   1. 每条 role=content 的期望词是否标注了非空 pictogramId（无缺口）
//   2. golden 引用的所有图符 id（pictogramId / altIds / forbiddenIds）是否真实存在于词库
//   3. 深度覆盖：期望词的 word 是否被对应图符的 labels.zh + synonyms 覆盖（标注与词库是否闭环）
// 用法：node scripts/golden/check-golden-keys.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const golden = JSON.parse(fs.readFileSync(path.join(root, 'scripts/golden/golden-set.json'), 'utf8'));
const pictograms = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seed/pictograms.json'), 'utf8'));

// 图符索引
const byId = new Map();
for (const p of pictograms) {
  byId.set(p.id, p);
}

const norm = (s) => String(s ?? '').trim();

// 收集该图符能覆盖的全部词形（labels.zh + synonyms + labels.en 仅作参考）
function coverWords(p) {
  const set = new Set();
  for (const w of p.labels?.zh ?? []) set.add(norm(w));
  for (const w of p.synonyms ?? []) set.add(norm(w));
  return set;
}

const problems = []; // 问题清单
const gaps = [];     // content 词无图符
const missingRefs = []; // 引用的 id 不存在于词库
const uncovered = [];   // word 未被图符 labels/synonyms 覆盖

const contentTotal = { n: 0, hasId: 0 };
const refIds = new Map(); // id -> 被引用的位置列表

function registerRef(id, where) {
  if (!refIds.has(id)) refIds.set(id, []);
  refIds.get(id).push(where);
}

for (const c of golden.cases) {
  for (const exp of c.expected ?? []) {
    const where = `${c.id} ${c.sentence} → ${exp.segment}(${exp.word})`;
    if (exp.role === 'content') {
      contentTotal.n++;
      if (exp.pictogramId) {
        contentTotal.hasId++;
        registerRef(exp.pictogramId, `${where} [pictogramId]`);
        const p = byId.get(exp.pictogramId);
        if (!p) {
          missingRefs.push(`${where}：引用图符 ${exp.pictogramId} 不在词库`);
        } else {
          // 深度覆盖：word 或 segment 必须被该图符覆盖
          const words = coverWords(p);
          const ok = [norm(exp.word), norm(exp.segment)].some((w) => w && words.has(w));
          if (!ok) {
            uncovered.push(
              `${where}：期望图 ${exp.pictogramId} 的词形 [${[...words].join(' / ')}] 未覆盖 word=${exp.word}`,
            );
          }
        }
      } else {
        gaps.push(`${where}：content 词未标注图符（pictogramId=null）`);
      }
    }
    for (const alt of exp.altIds ?? []) {
      registerRef(alt, `${where} [altId]`);
      if (!byId.has(alt)) missingRefs.push(`${where}：altId ${alt} 不在词库`);
    }
  }
  for (const f of c.forbiddenIds ?? []) {
    registerRef(f, `${c.id} ${c.sentence} [forbidden]`);
    if (!byId.has(f)) missingRefs.push(`${c.id} ${c.sentence}：forbiddenId ${f} 不在词库`);
  }
}

// ===== 输出 =====
console.log('==== golden 关键词 ↔ 图符 核对结果 ====');
console.log(`case 数：${golden.cases.length}`);
console.log(`content 期望词：${contentTotal.n}，其中已标注图符 ${contentTotal.hasId}，无图 ${contentTotal.n - contentTotal.hasId}`);
console.log(`词库图符总数：${pictograms.length}`);
console.log(`golden 引用不同图符 id 数：${refIds.size}`);
console.log('');

console.log(`【1】content 词无图符（图库缺口）: ${gaps.length}`);
for (const g of gaps) console.log('   - ' + g);
console.log('');

console.log(`【2】引用的 id 不在词库（断链）: ${missingRefs.length}`);
for (const m of missingRefs) console.log('   - ' + m);
console.log('');

console.log(`【3】word 未被期望图符 labels/synonyms 覆盖（标注↔词库未闭环）: ${uncovered.length}`);
for (const u of uncovered) console.log('   - ' + u);
console.log('');

// 汇总：哪些词被多个图符同时覆盖（潜在歧义，仅供观察）
const wordToIds = new Map();
for (const c of golden.cases) {
  for (const exp of c.expected ?? []) {
    if (exp.role !== 'content' || !exp.pictogramId) continue;
    const w = norm(exp.word);
    if (!w) continue;
    if (!wordToIds.has(w)) wordToIds.set(w, new Set());
    wordToIds.get(w).add(exp.pictogramId);
  }
}
const ambiguous = [...wordToIds.entries()].filter(([, ids]) => ids.size > 1);
console.log(`【附】同一 word 标注了多个不同图符（歧义观察）: ${ambiguous.length}`);
for (const [w, ids] of ambiguous) console.log(`   - ${w} → ${[...ids].join(', ')}`);

// 结论
const total = problems.length + gaps.length + missingRefs.length + uncovered.length;
console.log('');
if (total === 0) {
  console.log('✅ 结论：golden 集所有关键词都有对应图符，且引用全部有效、word 与图符词形闭环。');
} else {
  console.log(`❌ 结论：共 ${total} 处问题，见上。`);
}
