// 一次性脚本：生成"接收"Tab 图标（耳朵形状，81×81 RGBA PNG）。
// 零依赖：Node 内置 zlib（deflate + crc32）手写 PNG 编码。
// 用法：node scripts/gen-receive-icon.mjs

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

// 耳朵形状：外椭圆 - 内孔椭圆 - 耳屏小椭圆
function insideEar(px, py) {
  const outer = Math.pow((px - 40.5) / 29, 2) + Math.pow((py - 40.5) / 34, 2) <= 1
  if (!outer) return false
  const inner = Math.pow((px - 32) / 12.5, 2) + Math.pow((py - 36) / 16.5, 2) <= 1
  if (inner) return false
  const tragus = Math.pow((px - 51) / 8, 2) + Math.pow((py - 27) / 9, 2) <= 1
  if (tragus) return false
  return true
}

function render(color) {
  const rgba = new Uint8Array(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let cover = 0
      for (const dy of [0.25, 0.75]) {
        for (const dx of [0.25, 0.75]) {
          if (insideEar(x + dx, y + dy)) cover += 1
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
writeFileSync(join(outDir, 'receive.png'), render([0x99, 0x99, 0x99])) // 未选中：灰
writeFileSync(join(outDir, 'receive-selected.png'), render([0x2b, 0xb6, 0xc4])) // 选中：主题青绿
console.log('written receive.png / receive-selected.png')
