/**
 * 零依赖别名 hook：把 `@/...` 从源码 import 解析到 <root>/src/...。
 * 配合 ts-node/register 在纯 Node 下加载运行 src 里的 TS 模块。
 * 用法：node -r ts-node/register/transpile-only -r ./scripts/golden/register-alias.cjs <script>.ts
 */
const path = require('path')
const fs = require('fs')
const Module = require('module')

const root = path.resolve(__dirname, '../..')
const origResolve = Module._resolveFilename

// ts-node 编译 `import x from 'xxx.json'` 的互操作在不同编译器下行为不一致，
// 导致拿到的可能是包装对象而非数组。对 src/data 下的 json（seed 图库、rehab 题库），
// 返回"既是数组又带 `.default` 自引用"的形态，使任何互操作都能取到原始数组；
// 其余 json 走原生 loader。
const dataDirs = [
  path.resolve(root, 'src', 'data', 'seed'),
  path.resolve(root, 'src', 'data', 'rehab')
]
const origJson = Module._extensions['.json']
Module._extensions['.json'] = function (_module, filename) {
  const abs = path.resolve(filename)
  if (dataDirs.some((d) => abs.startsWith(d + path.sep))) {
    const raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
    _module.exports = raw
    _module.exports.__esModule = true
    _module.exports.default = raw
  } else {
    origJson(_module, filename)
  }
}

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return origResolve.call(this, path.join(root, 'src', request.slice(2)), parent, isMain, options)
  }
  return origResolve.call(this, request, parent, isMain, options)
}