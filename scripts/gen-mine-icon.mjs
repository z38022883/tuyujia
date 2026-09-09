// 一次性脚本：生成"我的"Tab 图标（人形 stroke 风格，81×81 RGBA PNG）。
// 零依赖：Node 内置 zlib（deflate + crc32）手写 PNG 编码，与 gen-home-icon.mjs 同法。
// 形状与 src/assets/tabbar/mine.svg 一致：viewBox 24×24 缩放到 81×81（系数 3.375）。
//   头部：圆 cx=12 cy=7 r=4 → 圆环，圆心 (40.5, 23.625)，半径 13.5，环宽 5.0625（stroke 1.5）
//   身体：M20 21 v-2 a4... → 左竖线 x=27 / 右竖线 x=54（y 47.25→70.875）+ 上半圆弧
//         （圆心 (40.5, 47.25)，半径 13.5，仅 y < 47.25 部分），stroke 半宽 2.53125
// 用法：node scripts/gen-mine-icon.mjs

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

// 点到竖直线段（x = cx，y ∈ [y0, y1]）的距离；端点距离即 round linecap
function distToVSegment(px, py, cx, y0, y1) {
  let dy = 0
  if (py < y0) dy = y0 - py
  else if (py > y1) dy = py - y1
  return Math.hypot(px - cx, dy)
}

// 点到上半圆弧（圆心 (cx, cy)，半径 r，仅 y ≤ cy，角度 180°–360°）的距离
function distToUpperArc(px, py, cx, cy, r) {
  if (py <= cy) {
    // 点在直径线上方：最近点在圆周上（沿圆心→点方向）
    return Math.abs(Math.hypot(px - cx, py - cy) - r)
  }
  // 点在直径线下方：最近点为弧的两个端点
  return Math.min(Math.hypot(px - (cx - r), py - cy), Math.hypot(px - (cx + r), py - cy))
}

function insideIcon(px, py) {
  // 头部圆环：距圆心距离 ∈ [10.97, 16.03]（半径 13.5 ± 环宽半 2.53125）
  const dHead = Math.hypot(px - 40.5, py - 23.625)
  if (dHead >= 10.97 && dHead <= 16.03) return true
  // 身体：到三段中心线（左竖线、右竖线、上半圆弧）的最短距离 < 2.53（stroke 半宽）
  const dBody = Math.min(
    distToVSegment(px, py, 27, 47.25, 70.875),
    distToVSegment(px, py, 54, 47.25, 70.875),
    distToUpperArc(px, py, 40.5, 47.25, 13.5)
  )
  return dBody < 2.53
}

function render(color) {
  const rgba = new Uint8Array(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let cover = 0
      for (const dy of [0.25, 0.75]) {
        for (const dx of [0.25, 0.75]) {
          if (insideIcon(x + dx, y + dy)) cover += 1
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
writeFileSync(join(outDir, 'mine.png'), render([0x99, 0x99, 0x99])) // 未选中：灰
writeFileSync(join(outDir, 'mine-selected.png'), render([0x4a, 0x9c, 0x6e])) // 选中：主题冷绿
console.log('written mine.png / mine-selected.png')
