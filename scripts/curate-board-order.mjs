// 图符板内顺序策展（manualOrder 赋值）
//
// 语义（见 src/data/index.ts byManualOrder）：
//   兜底板（无 tiles 的板）的自有图符按 manualOrder 升序置前，无值项保持数组序排后。
//   本脚本即「各板目标顺序」的唯一事实来源，重复执行幂等。
//
// 注意：
//   - manualOrder 是图符单值，跨兜底板归属的图符（p_here/p_there/p_now）不在此标值，
//     靠「无值项保持数组序」自然落位，避免单值同时影响两块板。
//   - 策展板（home/quickchat/actions/repair 等有 tiles 的板）不走 manualOrder，不受影响。
//   - 文件为 CRLF 行尾，重写时保持 CRLF，保证 git diff 只含 manualOrder 变化。
//
// 用法：node scripts/curate-board-order.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE = join(__dirname, '..', 'src', 'data', 'seed', 'pictograms.json')

// { 图符id: manualOrder }，各板编号块内 1..N 连续
const ORDER_MAP = {
  // === medical（53 自有）：应急 3 词 + 新扩充 5 词置顶，其余保持数组序 ===
  p_help_me: 1, // 帮帮我
  p_call_doctor: 2, // 请叫医生
  p_call_nurse: 3, // 请叫护士
  m_measure: 4, // 量（2026-09 新）
  m_check: 5, // 检查（2026-09 新）
  m_injection: 6, // 打针（2026-09 新）
  p_open_mouth: 7, // 张嘴（2026-09 新）
  m_deep_breath: 8, // 深呼吸（2026-09 新）

  // === daily（26 自有）：如厕→洗漱→穿衣→洗护用品→下雨，其余保持数组序 ===
  p_toilet: 1, // 厕所
  p_shower: 2, // 洗澡
  p_brush_teeth: 3, // 刷牙
  p_wash_hands: 4, // 洗手
  o_trousers: 5, // 裤子
  o_shoes: 6, // 鞋
  o_socks: 7, // 袜子
  o_coat: 8, // 外套
  o_hat: 9, // 帽子
  hy_soap: 10, // 肥皂
  hy_shampoo: 11, // 洗发水
  hy_wet: 12, // 湿了
  hy_dirty: 13, // 脏了
  w_rain: 14, // 下雨（2026-09 新）

  // === emotions（20 自有）：核心情绪→心情状态→喜欢类→放心→冷热渴饿，全量排序 ===
  p_happy: 1, // 开心
  p_sad: 2, // 伤心
  p_angry: 3, // 生气
  p_afraid: 4, // 害怕
  p_tired: 5, // 累
  e_mood: 6, // 心情（2026-09 新）
  p_nervous: 7, // 紧张
  p_bored: 8, // 无聊
  p_anxious: 9, // 着急
  p_lonely: 10, // 孤单
  p_dejected: 11, // 沮丧
  p_calm: 12, // 平静
  p_upset: 13, // 难过
  p_love: 14, // 喜欢
  p_dislike: 15, // 不喜欢
  e_relieved: 16, // 放心
  p_cold: 17, // 冷
  p_hot: 18, // 热
  p_thirsty: 19, // 渴
  p_hungry: 20, // 饿

  // === places（19 自有）：家→医院→救护车→常去场所→居室→交通，这里/那里 不标（跨 medical）===
  p_home: 1, // 家
  p_hospital: 2, // 医院
  pl_ambulance: 3, // 救护车（2026-09 新）
  p_playground: 4, // 公园
  p_school: 5, // 学校
  p_supermarket: 6, // 超市
  p_shop: 7, // 商店
  p_outside: 8, // 外面
  pl_downstairs: 9, // 楼下
  p_bedroom: 10, // 卧室
  p_kitchen: 11, // 厨房
  p_living_room: 12, // 客厅
  pl_room: 13, // 房间
  pl_bus: 14, // 公交车
  pl_taxi: 15, // 出租车
  pl_subway: 16, // 地铁
  p_rehab_dept: 17, // 康复科

  // === objects（31 自有）：常用家具/家电→生活物件，全量排序 ===
  p_bed: 1, // 床
  p_table: 2, // 桌子
  p_chair: 3, // 椅子
  p_blanket: 4, // 被子
  p_lamp: 5, // 灯
  p_phone: 6, // 手机
  p_television: 7, // 电视
  p_computer: 8, // 电脑
  p_cup: 9, // 杯子
  p_pillow: 10, // 枕头
  o_door: 11, // 门
  o_window: 12, // 窗户
  p_flower: 13, // 花
  p_car: 14, // 车
  p_money: 15, // 钱
  p_book: 16, // 书
  p_bag: 17, // 包
  p_key: 18, // 钥匙
  p_umbrella: 19, // 雨伞
  p_glasses: 20, // 眼镜
  p_bowl: 21, // 碗
  p_pen: 22, // 笔
  p_chopsticks: 23, // 筷子
  p_tissue: 24, // 纸巾
  p_spoon: 25, // 勺子
  p_remote: 26, // 遥控器
  o_charger: 27, // 充电器
  o_noisy: 28, // 吵
  o_quiet: 29, // 安静
  o_light_off: 30, // 关灯
  o_light_on: 31, // 开灯

  // === people（16 自有）：直系→配偶子女→兄弟姐妹→祖辈→其他，全量排序 ===
  p_mother: 1, // 妈妈
  p_father: 2, // 爸爸
  p_family: 3, // 家人
  p_call_family: 4, // 请叫家人
  p_husband: 5, // 老公/丈夫
  p_wife: 6, // 老婆/妻子
  p_son: 7, // 儿子
  p_daughter: 8, // 女儿
  p_brother: 9, // 哥哥
  p_older_sister: 10, // 姐姐
  p_sister: 11, // 妹妹
  p_grandfather: 12, // 爷爷
  p_grandmother: 13, // 奶奶
  p_friend: 14, // 朋友
  p_teacher: 15, // 老师
  p_caregiver: 16, // 看护人

  // === activities（14 自有）：作息→出行→训练→余暇，全量排序 ===
  p_sleep: 1, // 睡觉
  p_wake_up: 2, // 起床
  p_rest: 3, // 休息
  a_go_out: 4, // 出门
  a_go_home: 5, // 回家
  a_rehab_training: 6, // 康复训练
  a_practice: 7, // 练习
  a_wear: 8, // 穿衣
  a_take_off_clothes: 9, // 脱衣
  p_make_call: 10, // 打电话
  p_watch_tv: 11, // 看电视
  p_read_book: 12, // 看书
  p_run: 13, // 跑
  a_lie_down: 14, // 躺

  // === time（14 自有）：几点→今明昨→时段→频率，现在 不标（跨 daily）===
  p_clock: 1, // 几点（2026-09 新）
  p_today: 2, // 今天
  p_tomorrow: 3, // 明天
  p_yesterday: 4, // 昨天
  p_morning: 5, // 早上
  p_afternoon: 6, // 下午
  p_night: 7, // 今晚
  p_weekend: 8, // 周末
  p_when: 9, // 什么时候
  p_everyday: 10, // 每天
  p_soon: 11, // 马上
  p_always: 12, // 一直
  p_later: 13 // 以后
}

const raw = readFileSync(FILE, 'utf8')
const arr = JSON.parse(raw)
const byId = new Map(arr.map((p) => [p.id, p]))

let applied = 0
const missing = []
for (const [id, order] of Object.entries(ORDER_MAP)) {
  const p = byId.get(id)
  if (!p) {
    missing.push(id)
    continue
  }
  if (p.manualOrder !== order) {
    p.manualOrder = order
    applied++
  }
}
if (missing.length) {
  console.error('[curate] 缺失图符 id，已中止写入:', missing.join(', '))
  process.exit(1)
}

const out = (JSON.stringify(arr, null, 2) + '\n').replace(/\n/g, '\r\n')
if (out === raw) {
  console.log('[curate] 无变化（ORDER_MAP 与现有值一致）')
  process.exit(0)
}
writeFileSync(FILE, out, 'utf8')
console.log(`[curate] 已应用 ${applied} 处 manualOrder 变更`)
