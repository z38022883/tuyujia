#!/usr/bin/env node
/**
 * 康复题库生成器（批次 2）
 *
 * 依据 src/data/seed/pictograms.json 图库，确定性生成结构化题型：
 *  - pick-from-pictograms：听词指认（listening）/ 看字选图（reading）
 *  - match-pair：图文配对（同类 4 词一组，listening）
 *  - categorize：词汇分类（2-3 桶 × 6-9 词，listening）
 *
 * 规则：
 *  - 干扰项优先同主类别（categoryId），不足再取副类别，最后取全局名词类图库
 *    （同类别语义近邻干扰，对应「语义扩散激活」理论）
 *  - 每个目标词生成 >=3 套平行选项组（parallelGroup 相同、干扰项组合不同），
 *    重度核心词由 check-rehab-tasks.mjs 强制校验 >=3
 *  - 固定种子（每任务独立 hash 种子），输出可复现：同代码 → 同 tasks.generated.json
 *  - 叙事题（指令/短文/脚本/成语/临摹/哼唱）不在此生成，见 tasks.manual.json
 *
 * 产物：src/data/rehab/tasks.generated.json
 * 用法：node scripts/gen-rehab-tasks.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'))

const pictograms = readJson('src/data/seed/pictograms.json')
const byId = new Map(pictograms.map((p) => [p.id, p]))
const labelOf = (id) => byId.get(id)?.labels?.zh?.[0]

/** 展示用标签必须干净：无斜杠备选、无拉丁字母 */
const cleanLabel = (p) => {
  const zh = p?.labels?.zh?.[0] ?? ''
  return zh && !zh.includes('/') && !/[a-zA-Z]/.test(zh)
}

// ===== 确定性随机 =====
const GLOBAL_SEED = 20260920

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(str) {
  let h = 2166136261
  for (const ch of str) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffle(list, seed) {
  const arr = [...list]
  const rand = mulberry32(seed)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ===== 词池（人工审定：标签干净、生活高频、图意明确）=====

const POOLS = {
  severe: {
    // 重度：具体名词，生活最高频（吃喝、盥洗、居家、联系）
    pickListen: [
      'p_water', 'p_cup', 'p_bowl', 'p_spoon',
      'p_toothbrush', 'p_towel', 'p_bed', 'p_chair',
      'p_apple', 'p_milk', 'p_medicine', 'p_phone'
    ],
    pickRead: ['p_eat', 'p_drink', 'p_sleep', 'p_clothes', 'p_toilet', 'p_shower'],
    match: [
      { slug: 'wash', theme: '日常洗漱', items: ['p_towel', 'p_toothbrush', 'hy_soap', 'p_toilet_paper'] },
      { slug: 'fruit', theme: '水果食物', items: ['p_apple', 'p_banana', 'p_egg', 'p_bread'] },
      { slug: 'family', theme: '家人', items: ['p_mother', 'p_father', 'p_grandfather', 'p_grandmother'] },
      { slug: 'body', theme: '身体部位', items: ['p_head', 'p_hand', 'p_foot_body', 'p_eye_body'] }
    ],
    categorize: [
      {
        slug: 'food-daily',
        theme: '食物和日常用品',
        buckets: [
          { key: 'food', label: '食物' },
          { key: 'daily', label: '日常用品' }
        ],
        items: ['p_bread', 'p_banana', 'p_egg', 'p_towel', 'p_toothbrush', 'hy_soap']
      },
      {
        slug: 'food-tableware',
        theme: '食物和餐具',
        buckets: [
          { key: 'food', label: '食物' },
          { key: 'objects', label: '餐具物品' }
        ],
        items: ['p_milk', 'p_tea', 'p_candy', 'p_cup', 'p_bowl', 'p_spoon']
      },
      {
        slug: 'people-body',
        theme: '家人和身体',
        buckets: [
          { key: 'people', label: '家人朋友' },
          { key: 'medical', label: '身体医疗' }
        ],
        items: ['p_mother', 'p_friend', 'p_son', 'p_head', 'p_hand', 'p_nurse']
      }
    ]
  },
  moderate: {
    // 中度：医疗场景、身体感受、家居环境、社会关系
    pickListen: [
      'p_doctor', 'p_nurse', 'p_hospital', 'p_headache',
      'p_fever', 'p_cough', 'p_grandmother', 'p_friend',
      'p_school', 'p_kitchen', 'p_bedroom', 'p_rice',
      'p_noodles', 'p_vegetable', 'p_tea', 'p_coffee',
      'p_exercise', 'p_haircut'
    ],
    pickRead: ['p_hospital', 'p_doctor', 'p_apple', 'p_milk', 'p_phone', 'p_key', 'p_glasses', 'p_umbrella', 'p_chair', 'p_clothes'],
    match: [
      { slug: 'body2', theme: '身体部位', items: ['p_shoulder', 'p_back_body', 'p_neck', 'p_leg_body'] },
      { slug: 'places', theme: '地点', items: ['p_hospital', 'p_school', 'p_kitchen', 'p_bedroom'] },
      { slug: 'emotion', theme: '情绪', items: ['p_happy', 'p_sad', 'p_angry', 'p_afraid'] },
      { slug: 'drink', theme: '饮品食物', items: ['p_tea', 'p_coffee', 'p_milk', 'p_congee'] },
      { slug: 'family2', theme: '家人', items: ['p_brother', 'p_older_sister', 'p_sister', 'p_son'] }
    ],
    categorize: [
      {
        slug: 'food-places',
        theme: '食物和地点',
        buckets: [
          { key: 'food', label: '食物' },
          { key: 'places', label: '地点' }
        ],
        items: ['p_noodles', 'p_vegetable', 'p_soup', 'p_hospital', 'p_school', 'p_kitchen']
      },
      {
        slug: 'people-medical',
        theme: '家人和医疗',
        buckets: [
          { key: 'people', label: '家人朋友' },
          { key: 'medical', label: '身体医疗' }
        ],
        items: ['p_brother', 'p_teacher', 'p_wife', 'p_eye_body', 'p_foot_body', 'p_medicine']
      },
      {
        slug: 'objects-food',
        theme: '物品和食物',
        buckets: [
          { key: 'objects', label: '常用物品' },
          { key: 'food', label: '食物' }
        ],
        items: ['p_phone', 'p_key', 'p_umbrella', 'p_rice', 'p_meat', 'p_bread']
      },
      {
        slug: 'emotion-daily',
        theme: '情绪和穿戴',
        buckets: [
          { key: 'emotions', label: '情绪' },
          { key: 'daily', label: '穿戴用品' }
        ],
        items: ['p_happy', 'p_afraid', 'p_angry', 'p_clothes', 'o_shoes', 'o_hat']
      },
      {
        slug: 'food-medical-places',
        theme: '食物、医疗和地点',
        buckets: [
          { key: 'food', label: '食物' },
          { key: 'medical', label: '医疗' },
          { key: 'places', label: '地点' }
        ],
        items: ['p_apple', 'p_coffee', 'p_fruit', 'p_doctor', 'p_nurse', 'p_wheelchair', 'p_playground', 'p_shop', 'p_home']
      }
    ]
  },
  mild: {
    // 轻度：语义近邻易混词（时间词、情绪词），干扰更强
    pickListen: [
      'p_today', 'p_tomorrow', 'p_yesterday', 'p_morning',
      'p_afternoon', 'p_weekend', 'p_now', 'p_soon',
      'p_nervous', 'p_anxious', 'p_lonely', 'p_calm'
    ],
    pickRead: ['p_rehab', 'm_check', 'p_blood_pressure', 'm_deep_breath', 'p_rehab_dept', 'pl_subway', 'pl_taxi', 'pl_bus'],
    match: [
      { slug: 'time', theme: '时间', items: ['p_today', 'p_tomorrow', 'p_yesterday', 'p_weekend'] },
      { slug: 'desc', theme: '大小快慢', items: ['d_big', 'd_small', 'd_fast', 'd_slow'] },
      { slug: 'traffic', theme: '交通工具', items: ['pl_bus', 'pl_taxi', 'pl_subway', 'pl_ambulance'] },
      { slug: 'medsupply', theme: '医疗用品', items: ['p_medicine', 'p_wheelchair', 'p_blood_pressure', 'm_injection'] }
    ],
    categorize: [
      {
        slug: 'food-places-people',
        theme: '食物、地点和家人',
        buckets: [
          { key: 'food', label: '食物' },
          { key: 'places', label: '地点' },
          { key: 'people', label: '家人' }
        ],
        items: ['p_egg', 'p_meat', 'p_ice_cream', 'p_supermarket', 'p_playground', 'p_school', 'p_father', 'p_daughter', 'p_caregiver']
      },
      {
        slug: 'time-emotion-activity',
        theme: '时间、情绪和活动',
        buckets: [
          { key: 'time', label: '时间' },
          { key: 'emotions', label: '情绪' },
          { key: 'activities', label: '活动' }
        ],
        items: ['p_today', 'p_yesterday', 'p_morning', 'p_nervous', 'p_lonely', 'p_calm', 'p_run', 'p_read_book', 'p_watch_tv']
      },
      {
        slug: 'med-traffic-objects',
        theme: '医疗、交通和物品',
        buckets: [
          { key: 'medical', label: '医疗' },
          { key: 'places', label: '交通工具' },
          { key: 'objects', label: '常用物品' }
        ],
        items: ['p_medicine', 'm_injection', 'p_blood_pressure', 'pl_bus', 'pl_taxi', 'pl_subway', 'p_bed', 'p_table', 'p_television']
      },
      {
        slug: 'body-food-time',
        theme: '身体、食物和时间',
        buckets: [
          { key: 'medical', label: '身体部位' },
          { key: 'food', label: '食物' },
          { key: 'time', label: '时间' }
        ],
        items: ['p_shoulder', 'p_chest', 'p_neck', 'p_congee', 'p_noodles', 'p_ice_cream', 'p_tomorrow', 'p_weekend', 'p_night']
      }
    ]
  }
}

// 出题参数：选项数（重度少选项更易、轻度多选项更难）、平行组数、难度
const LEVEL_CONF = {
  severe: { abbr: 'sv', pickOptions: 4, pickSets: 3, pickDiff: 1, matchDiff: 1, catDiff: 2, pickReadSets: 2 },
  moderate: { abbr: 'md', pickOptions: 4, pickSets: 3, pickDiff: 2, matchDiff: 2, catDiff: 3, pickReadSets: 2 },
  mild: { abbr: 'mi', pickOptions: 6, pickSets: 3, pickDiff: 3, matchDiff: 3, catDiff: 4, pickReadSets: 2 }
}

// ===== 生成 =====

/** 全局兜底干扰项池：排除 repair（修正澄清短语图意抽象，做选项易困惑） */
const REST_POOL = pictograms.filter((p) => p.categoryId !== 'repair' && cleanLabel(p))

function distractorPool(answer) {
  const primary = pictograms.filter((p) => p.categoryId === answer.categoryId && p.id !== answer.id && cleanLabel(p))
  const secondary = pictograms.filter(
    (p) => p.categoryId !== answer.categoryId && (p.categoryIds ?? []).includes(answer.categoryId) && cleanLabel(p)
  )
  const rest = REST_POOL.filter((p) => p.id !== answer.id && !primary.includes(p) && !secondary.includes(p))
  return { primary, secondary, rest }
}

function buildPickTasks(level, ids, variant, setsPerWord, optionCount, difficulty) {
  const conf = LEVEL_CONF[level]
  const dimension = variant === 'listen' ? 'listening' : 'reading'
  const kind = variant === 'listen' ? 'pick' : 'pickread'
  const titlePrefix = variant === 'listen' ? '听词指认' : '看字选图'
  const out = []

  for (const id of ids) {
    const answer = byId.get(id)
    if (!answer) throw new Error(`图库中不存在 ${id}`)
    const word = labelOf(id)
    const { primary, secondary, rest } = distractorPool(answer)
    const seen = new Set()

    for (let s = 1; s <= setsPerWord; s++) {
      const seed = hashStr(`${GLOBAL_SEED}|${level}|${id}|${variant}|${s}`)
      const near = [...primary, ...secondary]
      // 近邻池单独洗牌后按需取，保证同类别干扰优先；不足再从全局补
      const nearShuffled = seededShuffle(near, seed)
      const restShuffled = seededShuffle(rest, seed ^ 0x9e3779b9)
      const need = optionCount - 1
      let distractors = [...nearShuffled.slice(0, need), ...restShuffled.slice(0, Math.max(0, need - nearShuffled.length))]
      if (distractors.length < need) throw new Error(`${id} 干扰项不足（需 ${need}，得 ${distractors.length}）`)

      // 平行组之间组合必须不同：撞车则用下一个未用干扰项替换
      let combo = distractors.map((d) => d.id).sort().join(',')
      if (seen.has(combo)) {
        const used = new Set(distractors.map((d) => d.id))
        const spare = [...nearShuffled, ...restShuffled].find((d) => !used.has(d.id))
        if (spare) {
          distractors = [...distractors.slice(0, need - 1), spare]
          combo = distractors.map((d) => d.id).sort().join(',')
        }
      }
      if (seen.has(combo)) throw new Error(`${id} 第 ${s} 套平行组与已有组合重复`)
      seen.add(combo)

      out.push({
        id: `g-${conf.abbr}-${kind}-${id.replace(/^[a-z]+_/, '')}-${s}`,
        taskType: 'pick-from-pictograms',
        title: `${titlePrefix}：${word}`,
        level,
        dimension,
        difficulty,
        prompt: variant === 'listen' ? '听语音，选出对应的图片' : '看文字，选出对应的图片',
        parallelGroup: `${kind}:${word}`,
        enabled: true,
        payload: {
          taskType: 'pick-from-pictograms',
          variant,
          word,
          answerId: id,
          optionIds: [id, ...distractors.map((d) => d.id)]
        }
      })
    }
  }
  return out
}

function buildMatchTasks(level, specs, difficulty) {
  const conf = LEVEL_CONF[level]
  return specs.map((spec) => ({
    id: `g-${conf.abbr}-match-${spec.slug}`,
    taskType: 'match-pair',
    title: `图文配对：${spec.theme}`,
    level,
    dimension: 'listening',
    difficulty,
    prompt: '把词语和对应的图片配对',
    enabled: true,
    payload: {
      taskType: 'match-pair',
      pairs: spec.items.map((id) => ({ text: labelOf(id), pictogramId: id }))
    }
  }))
}

function buildCategorizeTasks(level, specs, difficulty) {
  const conf = LEVEL_CONF[level]
  return specs.map((spec) => {
    const bucketKeys = new Set(spec.buckets.map((b) => b.key))
    const items = spec.items.map((id) => {
      const p = byId.get(id)
      if (!p) throw new Error(`图库中不存在 ${id}`)
      if (!bucketKeys.has(p.categoryId)) {
        throw new Error(`分类题 ${spec.slug}：${id}（${p.categoryId}）不在桶 ${[...bucketKeys].join('/')} 内`)
      }
      return { id, category: p.categoryId }
    })
    return {
      id: `g-${conf.abbr}-cat-${spec.slug}`,
      taskType: 'categorize',
      title: `词汇分类：${spec.theme}`,
      level,
      dimension: 'listening',
      difficulty,
      prompt: '先点分类，再点词语，把词语放进正确的分类',
      enabled: true,
      payload: {
        taskType: 'categorize',
        categories: spec.buckets,
        items
      }
    }
  })
}

// ===== 汇总 =====

const tasks = []
for (const level of ['severe', 'moderate', 'mild']) {
  const pool = POOLS[level]
  const conf = LEVEL_CONF[level]
  tasks.push(
    ...buildPickTasks(level, pool.pickListen, 'listen', conf.pickSets, conf.pickOptions, conf.pickDiff),
    ...buildPickTasks(level, pool.pickRead, 'read', conf.pickReadSets, conf.pickOptions, conf.pickDiff),
    ...buildMatchTasks(level, pool.match, conf.matchDiff),
    ...buildCategorizeTasks(level, pool.categorize, conf.catDiff)
  )
}

// id 唯一性自检
const idSet = new Set(tasks.map((t) => t.id))
if (idSet.size !== tasks.length) throw new Error('生成 id 存在重复')

const outPath = path.join(root, 'src/data/rehab/tasks.generated.json')
writeFileSync(outPath, JSON.stringify(tasks, null, 2) + '\n', 'utf8')

// 摘要
const byLevelType = {}
for (const t of tasks) {
  const k = `${t.level}/${t.taskType}`
  byLevelType[k] = (byLevelType[k] ?? 0) + 1
}
console.log(`生成 ${tasks.length} 题写入 src/data/rehab/tasks.generated.json`)
for (const level of ['severe', 'moderate', 'mild']) {
  const n = tasks.filter((t) => t.level === level).length
  console.log(`  ${level}: ${n} 题`)
}
console.log(JSON.stringify(byLevelType, null, 2))
