import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Canvas, View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { TraceCharPayload } from '@/types/rehab'
import { useSubmit } from './useSubmit'
import FeedbackFlash from './FeedbackFlash'
import type { TaskBodyProps } from './types'
import styles from './shared.module.scss'

const isH5 = process.env.TARO_ENV === 'h5'

/**
 * 汉字临摹（完成记录题，不判字形）：田字格大字衬底 + canvas 自由描写。
 * - weapp：Taro Canvas(type=2d) + SelectorQuery 取 node
 * - h5：Taro 的 taro-canvas-core 在 H5 不创建内部 canvas，改为宿主 View 内
 *   命令式创建原生 canvas（触摸事件 passive:false 防滚动）
 * 两端初始化失败均降级为「大字照写」提示 + 完成按钮。
 */
export default function TraceCharTask({ task, level, onDone }: TaskBodyProps) {
  const payload = task.payload as TraceCharPayload
  const canvasId = `trace_${task.id.replace(/[^a-zA-Z0-9_]/g, '')}`
  const { flash, locked, submit } = useSubmit(onDone)

  const [canvasFailed, setCanvasFailed] = useState(false)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const rectRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 })
  const hostRef = useRef<any>(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  const chars = [...payload.text]
  // 按字数定田字格尺寸：重度短词放大，3/4 字词缩格防超屏宽
  const cellSize =
    chars.length >= 4
      ? styles.traceCellSm
      : chars.length === 3
        ? styles.traceCellMd
        : level === 'severe'
          ? styles.traceCellLg
          : ''

  const setupPen = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#2d6a4f'
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.strokeStyle = 'rgba(45, 106, 79, 0.12)'
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
    ctx.restore()
    setupPen(ctx)
  }

  const getPos = (e: any): { x: number; y: number } | null => {
    const t = e.touches?.[0] ?? e.changedTouches?.[0]
    if (!t) return null
    // weapp 的 canvas touch 事件带相对坐标 x/y；h5 为 clientX/Y - 画布偏移
    if (typeof t.x === 'number' && typeof t.y === 'number') return { x: t.x, y: t.y }
    return { x: t.clientX - rectRef.current.left, y: t.clientY - rectRef.current.top }
  }

  const onTouchStart = (e: any) => {
    const ctx = ctxRef.current
    if (!ctx) return
    drawingRef.current = true
    lastPosRef.current = getPos(e)
  }

  const onTouchMove = (e: any) => {
    const ctx = ctxRef.current
    if (!ctx || !drawingRef.current) return
    const pos = getPos(e)
    const last = lastPosRef.current
    if (!pos || !last) return
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  const onTouchEnd = () => {
    drawingRef.current = false
    lastPosRef.current = null
  }

  useEffect(() => {
    if (isH5) {
      // h5：宿主 View 内命令式创建原生 canvas
      const host = hostRef.current as HTMLElement | null
      if (!host) {
        setCanvasFailed(true)
        return
      }
      const cvs = document.createElement('canvas')
      cvs.style.width = '100%'
      cvs.style.height = '100%'
      cvs.style.touchAction = 'none'
      host.appendChild(cvs)
      const rect = cvs.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        setCanvasFailed(true)
        return
      }
      const dpr = window.devicePixelRatio || 2
      cvs.width = rect.width * dpr
      cvs.height = rect.height * dpr
      const ctx = cvs.getContext('2d')
      if (!ctx) {
        setCanvasFailed(true)
        return
      }
      ctx.scale(dpr, dpr)
      drawGrid(ctx, rect.width, rect.height)
      ctxRef.current = ctx
      sizeRef.current = { w: rect.width, h: rect.height }
      rectRef.current = { left: rect.left, top: rect.top }

      const opts: AddEventListenerOptions = { passive: false }
      cvs.addEventListener('touchstart', onTouchStart, opts)
      cvs.addEventListener('touchmove', onTouchMove, opts)
      cvs.addEventListener('touchend', onTouchEnd, opts)
      return () => {
        cvs.removeEventListener('touchstart', onTouchStart)
        cvs.removeEventListener('touchmove', onTouchMove)
        cvs.removeEventListener('touchend', onTouchEnd)
        cvs.remove()
      }
    }

    // weapp：SelectorQuery 取 canvas node
    const query = Taro.createSelectorQuery()
    query
      .select(`#${canvasId}`)
      .fields({ node: true, size: true, rect: true }, (item: any) => {
        const canvas = item?.node
        if (!canvas || !item?.width) {
          setCanvasFailed(true)
          return
        }
        const dpr = Taro.getSystemInfoSync().pixelRatio || 2
        canvas.width = item.width * dpr
        canvas.height = item.height * dpr
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setCanvasFailed(true)
          return
        }
        ctx.scale(dpr, dpr)
        drawGrid(ctx, item.width, item.height)
        ctxRef.current = ctx
        sizeRef.current = { w: item.width, h: item.height }
        rectRef.current = { left: item.left ?? 0, top: item.top ?? 0 }
      })
      .exec()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClear = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { w, h } = sizeRef.current
    drawGrid(ctx, w, h)
  }

  const handleDone = () => {
    if (locked) return
    submit({ correct: true, answer: `完成「${payload.text}」临摹` })
  }

  return (
    <View className={styles.body}>
      <View className={styles.centerCol}>
        {payload.pinyin && <Text className={styles.pinyinText}>{payload.pinyin}</Text>}
        <View className={styles.traceWrap}>
          <View className={styles.traceCells}>
            {chars.map((c, i) => (
              <View key={i} className={classnames(styles.traceCell, cellSize)}>
                <Text className={styles.traceChar}>{c}</Text>
              </View>
            ))}
          </View>
          {isH5 ? (
            <View id={canvasId} ref={hostRef} className={styles.traceCanvas} />
          ) : (
            <Canvas
              type="2d"
              id={canvasId}
              canvasId={canvasId}
              className={styles.traceCanvas}
              disableScroll
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            />
          )}
          {canvasFailed && (
            <View className={styles.traceFallback}>
              <Text className={styles.traceFallbackText}>照着上面的字，在纸上写一写</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.btnRow}>
        {!canvasFailed && (
          <View className={styles.btnGhost} onClick={handleClear}>
            <Text className={styles.btnGhostText}>擦掉重写</Text>
          </View>
        )}
        <View
          className={classnames(styles.btnPrimary, locked && styles.btnDisabled)}
          onClick={handleDone}
        >
          <Text className={styles.btnPrimaryText}>写完了 ✓</Text>
        </View>
      </View>

      <FeedbackFlash flash={flash} />
    </View>
  )
}
