/**
 * canvas — Canvas API 封装：画笔上下文、基本图形、离屏画布、
 * 视网膜初始化（CSS↔物理像素）、批渲染分组器
 */
import type { Bounds, Vec2 } from '../yomi'
import { Prim } from '../yomi'
import type { TsuModel } from '../m/model'
import { DPR_MAX } from './const'

// —— 画笔上下文 ——

/** save → 执行 → restore 包裹 */
export function Hcvs_ppCtx($ctx: CanvasRenderingContext2D, _call_: Function = () => {}, ...args: any[]) {
  $ctx.save()
  _call_ && _call_($ctx, ...args)
  $ctx.restore()
}

export function Hcvs_draw($ctx: CanvasRenderingContext2D, $options: {
    drawApi: Function
    styles?: CanvasPathDrawingStyles
}) {
    const { drawApi, styles } = $options
    $ctx.beginPath()
    drawApi()
    if (styles) {
        Object.entries(styles).forEach(([stk, stv]) => {
            if (stk in $ctx) ($ctx as any)[stk] = stv
        })
        $ctx.fill()
    }
    $ctx.stroke()
}

export function Hcvs_rect($ctx: CanvasRenderingContext2D, $args: { x: number, y: number, w: number, h: number }) {
    const { x, y, w, h } = $args
    Hcvs_draw($ctx, { drawApi: () => $ctx.rect(x, y, w, h) })
}

export function Hcvs_arc($ctx: CanvasRenderingContext2D, $args: { x: number, y: number, r: number, startAng: number, endAngle: number }) {
    const { x, y, r, startAng, endAngle } = $args
    Hcvs_draw($ctx, { drawApi: () => $ctx.arc(x, y, r, startAng, endAngle) })
}

export function Hcvs_line($ctx: CanvasRenderingContext2D, $args: { pths: Vec2[] }) {
    const { pths } = $args
    Hcvs_draw($ctx, {
        drawApi: () => {
            pths.forEach($vec => {
                const [x, y] = $vec
                $ctx.lineTo(x, y)
            })
        }
    })
}

/** 离屏画布 */
export const Hcvs_offscreen = ($w: number, $h: number, $draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas')
  c.width = $w; c.height = $h
  $draw(c.getContext('2d')!)
  return c
}

// —— 视网膜初始化 + 视线基准合成 ——

export function Hcvs_getDpr(): number {
  return Math.min(window.devicePixelRatio || 1, DPR_MAX)
}

export interface RetinaResult {
  dpr: number
  cssWidth: number
  cssHeight: number
  deviceWidth: number
  deviceHeight: number
  changed: boolean
}

/** 六元视线仿射 [a,b,c,d,e,f] — CoordMapper2D.clipMatrix 的消费形态 */
export type ViewAffine = Float32Array

/**
 * 视觉基准合成 — DPR 尺寸基准 × 视线仿射：物理像素 = CSS×DPR 写入 canvas 尺寸，
 * setTransform(dpr·a..dpr·f) 基准×视线一步合成；view 缺省即纯基准 [1,0,0,1,0,0]，
 * 六元仿射（2D gazeM）无条件合成，16 元剪裁矩阵（3D）无 2D ctx 语义跳过。
 * SoA x/y 统一 CSS 坐标系（与 e.offsetX/offsetY 一致）。
 */
export function Hcvs_retina($canvas: HTMLCanvasElement, $dpr?: number, $view?: ViewAffine | null): RetinaResult {
  const dpr = $dpr ?? Hcvs_getDpr()

  const rect = $canvas.getBoundingClientRect()
  const cssW = Math.floor(rect.width || $canvas.width)
  const cssH = Math.floor(rect.height || $canvas.height)

  const devW = Math.floor(cssW * dpr)
  const devH = Math.floor(cssH * dpr)

  const changed = $canvas.width !== devW || $canvas.height !== devH
  if (changed) {
    $canvas.width = devW
    $canvas.height = devH
    $canvas.style.width = `${cssW}px`
    $canvas.style.height = `${cssH}px`
  }

  // 基准×视线合成（六元仿射或缺省；16 元剪裁矩阵跳过）
  if (!$view || $view.length === 6) {
    const ctx = $canvas.getContext('2d')
    if (ctx) {
      const va = $view
      const a = va ? va[0] : 1, b = va ? va[1] : 0
      const c = va ? va[2] : 0, dd = va ? va[3] : 1
      const e = va ? va[4] : 0, f = va ? va[5] : 0
      ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * dd, dpr * e, dpr * f)
    }
  }

  return { dpr, cssWidth: cssW, cssHeight: cssH, deviceWidth: devW, deviceHeight: devH, changed }
}

// —— 批渲染分组器 ——

/** 按 Prim 分桶 index 列表 — 同类型共享绘制路径一批画 */
export interface Batch {
  prim: Prim
  indices: number[]
  count: number
}

export function Hcvs_batch($model: TsuModel, $els: number[]): Batch[] {
  const buckets: Map<Prim, number[]> = new Map()

  for (const i of $els) {
    const t = $model.type[i] as Prim
    let _bucket = buckets.get(t)
    if (!_bucket) {
      _bucket = []
      buckets.set(t, _bucket)
    }
    _bucket.push(i)
  }

  const result: Batch[] = []
  for (const [prim, indices] of buckets) {
    result.push({ prim, indices, count: indices.length })
  }
  return result
}
