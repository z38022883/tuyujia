// 一次性脚本：生成"首页"Tab 图标（房子形状，81×81 RGBA PNG）。
// 零依赖：Node 内置 zlib（deflate + crc32）手写 PNG 编码，与 gen-receive-icon.mjs 同法。
// 用法：node scripts/gen-home-icon.mjs

import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 81

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = rowStart + 1 + x * 4
      raw[dst] = rgba[src]
      raw[dst + 1] = rgba[src + 1]
      raw[dst + 2] = rgba[src + 2]
      raw[dst + 3] = rgba[src + 3]
    }
  }
  const idat = deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// 点在三角形内（含边界）
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

// 房子外形：屋顶三角（顶点 (40.5,10.5)，底边 (13,43)-(68,43)）+ 房身矩形 (16..65, 43..68)
function insideHouse(px, py) {
  if (inTriangle(px, py, 40.5, 10.5, 13, 43, 68, 43)) return true
  if (px >= 16 && px <= 65 && py >= 43 && py <= 68) return true
  return false
}

// 门：从房身抠出的矩形
function isDoor(px, py) {
  return px >= 34.5 && px <= 46.5 && py >= 51 && py <= 68
}

function render(color) {
  const rgba = new Uint8Array(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let cover = 0
      for (const dy of [0.25, 0.75]) {
        for (const dx of [0.25, 0.75]) {
          if (insideHouse(x + dx, y + dy) && !isDoor(x + dx, y + dy)) cover += 1
        }
      }
      const c = cover / 4
      const idx = (y * SIZE + x) * 4
      rgba[idx] = color[0]
      rgba[idx + 1] = color[1]
      rgba[idx + 2] = color[2]
      rgba[idx + 3] = Math.round(255 * c)
    }
  }
  return encodePng(SIZE, SIZE, rgba)
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'tabbar')
writeFileSync(join(outDir, 'home.png'), render([0x99, 0x99, 0x99])) // 未选中：灰
writeFileSync(join(outDir, 'home-selected.png'), render([0x2b, 0xb6, 0xc4])) // 选中：主题青绿
console.log('written home.png / home-selected.png')
