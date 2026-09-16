/**
 * canvas — Canvas API 二次封装 + 高级画布处理
 *
 * 包含：画笔上下文保存恢复、基本图形绘制封装、离屏画布、
 *       视网膜初始化（CSS↔物理像素映射）、批渲染分组器
 */
import type { Bounds, Vec2 } from '../yomi'
import { Prim } from '../yomi'
import type { TsuModel } from '../m/model'
import { DPR_MAX } from './const'

// —— 画笔上下文 ——

/** 压栈 + 执行 + 出栈（save/restore 包裹） */
export function Hcvs_ppCtx($ctx: CanvasRenderingContext2D, _call_: Function = () => {}, ...args: any[]) {
  $ctx.save()
  _call_ && _call_($ctx, ...args)
  $ctx.restore()
}

/** 开启路径 + 设置样式 + fill/stroke（自动管理画笔上下文压栈/出栈） */
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

/** 矩形绘制封装 */
export function Hcvs_rect($ctx: CanvasRenderingContext2D, $args: { x: number, y: number, w: number, h: number }) {
    const { x, y, w, h } = $args
    Hcvs_draw($ctx, { drawApi: () => $ctx.rect(x, y, w, h) })
}

/** 弧线绘制封装 */
export function Hcvs_arc($ctx: CanvasRenderingContext2D, $args: { x: number, y: number, r: number, startAng: number, endAngle: number }) {
    const { x, y, r, startAng, endAngle } = $args
    Hcvs_draw($ctx, { drawApi: () => $ctx.arc(x, y, r, startAng, endAngle) })
}

/** 折线绘制封装 */
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

/** 离屏画布 — 用于重量级渲染 */
export const Hcvs_offscreen = ($w: number, $h: number, $draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas')
  c.width = $w; c.height = $h
  $draw(c.getContext('2d')!)
  return c
}

// —— 视网膜初始化（CSS 像素 ↔ 物理像素映射）+ 视线基准合成 ——

/** 获取设备像素比（上限 3，避免极端值导致画布过大） */
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
 * 视觉基准合成 — 尺寸基准（DPR）× 视线仿射（view）。
 *
 * 参考 Chart.js retinaScale + AntV DPR 处理：
 * 1. 读取 canvas 的 CSS 尺寸（getBoundingClientRect）
 * 2. 物理像素 = CSS 尺寸 × DPR，取整后写入 canvas.width/height
 * 3. setTransform(dpr·a, dpr·b, dpr·c, dpr·d, dpr·e, dpr·f) — 基准×视线一步合成
 * 4. 后续所有绘制用 CSS 坐标系，DPR 与视线均透明
 *
 * view 缺省 → 纯基准 [1,0,0,1,0,0]（现状行为，engine.resize 等旧调用零影响）；
 * view 为六元仿射（2D gazeM）→ 无条件合成（视线每变必重设，不依赖 changed 守卫）；
 * view 为 16 元剪裁矩阵（3D）→ 无 2D ctx 概念，跳过合成（3D 视线走矩阵层）。
 *
 * SoA 的 x/y 统一用 CSS 坐标系，与 e.offsetX/offsetY 一致
 * 不区分图表类型——coord 规则决定布局，retina 只管像素映射与基准合成
 */
export function Hcvs_retina($canvas: HTMLCanvasElement, $dpr?: number, $view?: ViewAffine | null): RetinaResult {
  const dpr = $dpr ?? Hcvs_getDpr()

  // 读取 CSS 尺寸 — 优先 getBoundingClientRect，回退 canvas 属性
  const rect = $canvas.getBoundingClientRect()
  const cssW = Math.floor(rect.width || $canvas.width)
  const cssH = Math.floor(rect.height || $canvas.height)

  // 物理像素 = CSS × DPR
  const devW = Math.floor(cssW * dpr)
  const devH = Math.floor(cssH * dpr)

  const changed = $canvas.width !== devW || $canvas.height !== devH
  if (changed) {
    $canvas.width = devW
    $canvas.height = devH
    $canvas.style.width = `${cssW}px`
    $canvas.style.height = `${cssH}px`
  }

  // 基准×视线合成 — Canvas2D 统一缩放（view 缺省即纯基准，与现状等价）
  // view 非 null 且非六元（如 3D 的 16 元剪裁矩阵）→ 2D 无合成语义，跳过
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

/**
 * 参考 SC2：同类型单位共享材质和绘制路径 > 一次 draw call 画一批
 * 将传入元素列表按 type 重新分组 > 每组是一个 index 列表
 * render 调用 Hcvs_batch(model, 大名单) 拿到分组后 > 逐组批量绘制
 */
export interface Batch {
  prim: Prim
  indices: number[]
  count: number
}

/** 按 Prim 类型分组，返回各类型的 index 列表。单次遍历 O(k)，按 type 分桶。 */
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
