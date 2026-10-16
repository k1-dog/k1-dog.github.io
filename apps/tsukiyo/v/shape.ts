/**
 * shape — 图形原语工厂 + point 写入 SoA：
 * Shape = 描述符（type + opts + fill），'_' 占位由 coord 填充；
 * pointTask 是 SoA 图形数组唯一写入者（src/dimX/dimY/value/type/fill/w/h/aux/x/y/anim 单点物化）
 */
import type { ShapeDesc, Element, Plugins, CoordVal } from '../yomi'
import { Prim, _ } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_rgba, Hm_palette } from '../helper/maths'
import { DEFAULT_BAR_W, GEO_SLOTS_EACH_ELEM } from '../helper/const'

export const rgba = Hm_rgba

/**
 * aux slot map — per-Prim opts key → aux slot index (single materialize
 * entry, one loop, no scattered per-Prim branches):
 *   Circle: aux[0]=r
 *   Arc:    aux[0]=r, aux[1]=startAng, aux[2]=endAng
 *   Triangle: aux[0]=x2, aux[1]=y2
 *   Curve:  aux[0]=cp1x, aux[1]=cp1y, aux[2]=cp2x, aux[3]=cp2y
 * null = slot unused by this Prim (left untouched). A value that is
 * undefined or the `_` placeholder writes a NaN sentinel instead.
 */
const AUX_SLOTS: Partial<Record<Prim, readonly (string | null)[]>> = {
  [Prim.Circle]: ['r', null, null, null, null],
  [Prim.Arc]: ['r', 'startAng', 'endAng', null, null],
  // Ring — hollow stroked circle (ripple/halo semantics): aux[0] = r, the
  // ONLY geometry; the hollow-vs-filled distinction lives in the TYPE
  // channel (Prim.Ring vs Prim.Circle/Arc), never in an aux slot
  [Prim.Ring]: ['r', null, null, null, null],
  [Prim.Triangle]: ['x2', 'y2', null, null, null],
  [Prim.Curve]: ['cp1x', 'cp1y', 'cp2x', 'cp2y', null],
  // Rect: aux[0] = centered flag (1 = coord x/y anchor the CENTER, the
  // coord pass converts to the top-left for the renderer)
  [Prim.Rect]: ['centered', null, null, null, null],
}

// Shape 工厂 — '_' 占位由 coord 填充
export function Shape($type: Prim, opts: Record<string, CoordVal> = {}, $fill?: number): ShapeDesc {
  return { type: $type, opts, fill: $fill }
}

export const Shapes = {
  rect: ($w: number, $h: number, $fill?: number) => Shape(Prim.Rect, { x: _, y: _, w: $w, h: $h }, $fill),
  // centered rect — coord x/y anchor the RECT CENTER (column-center ticks
  // line up with the element's middle); the coord pass converts to top-left
  rectC: ($w: number, $h: number, $fill?: number) =>
    Shape(Prim.Rect, { x: _, y: _, w: $w, h: $h, centered: 1 }, $fill),
  circle: ($r: number, $fill?: number) => Shape(Prim.Circle, { x: _, y: _, r: $r }, $fill),
  line: ($fill?: number) => Shape(Prim.Line, { x: _, y: _, x2: _, y2: _ }, $fill),
  // arc — 角度传 `_`（占位）交系统按 value 比例分配（饼图扇段）；显式角度 = 固定扇（散点满圆）
  arc: ($r: number, $startAng: CoordVal, $endAng: CoordVal, $fill?: number) =>
    Shape(Prim.Arc, { x: _, y: _, r: $r, startAng: $startAng, endAng: $endAng }, $fill),
  // ring — 空心圆环原语（涟漪/光环语义）：描边不填充，环宽按半径比例
  ring: ($r: number, $fill?: number) =>
    Shape(Prim.Ring, { x: _, y: _, r: $r }, $fill),
  // sector — 扇段语法糖（arc 角度占位派生）：角度交 paths 按 value 比例分配（饼图语义，用户零 `_` 依赖）
  sector: ($r: number, $fill?: number) =>
    Shape(Prim.Arc, { x: _, y: _, r: $r, startAng: _, endAng: _ }, $fill),
  text: ($text: string, $fill?: number) => Shape(Prim.Text, { x: _, y: _, text: $text }, $fill),
  // 曲线 — 与 Line 同源占位（x,y 起点 + w,h Δ偏移），paths 组装 Δ
  // cp1/cp2 = 可选三次贝塞尔控制点（绝对画布坐标）：全指定 → 精确三次
  // 贝塞尔；缺省（NaN 哨兵）→ bezier3ToCurve 升维二次（段中点+法向公式）
  curve: ($fill?: number, $cp1?: [number, number], $cp2?: [number, number]) =>
    Shape(Prim.Curve, {
      x: _, y: _, w: _, h: _,
      cp1x: $cp1?.[0], cp1y: $cp1?.[1],
      cp2x: $cp2?.[0], cp2y: $cp2?.[1],
    }, $fill),
  // 三角形 — 三顶点占位：V_d(x,y) + V_{d+1}(w,h) + C(aux0,aux1)；coord 写 V_d，paths 写其余
  triangle: ($fill?: number) =>
    Shape(Prim.Triangle, { x: _, y: _, w: _, h: _, x2: _, y2: _ }, $fill),
}

// point 回调 — 用户自定义元素 → Shape
export type PointFn = (el: Element, plugins: Plugins, index: number) => ShapeDesc | ShapeDesc[]

// pointTask — 遍历 elements 调 pointFn 写 SoA（唯一写入点，count 定稿）
export function pointTask($model: TsuModel, $pointFn: PointFn): void {
  const plugins: Plugins = {
    vToM: ($slot: number) => $model.vToM($slot),
    mToV: ($query: Partial<Element>) => $model.mToV($query),
  }

  // re-typing overwrites the whole SoA from slot 0 — the PREVIOUS frame's
  // slots (0..count-1) may hold pixels of elements that are gone this frame
  // (e.g. storm bolt when the flash window closes, whose slot is reused by a
  // later element). Mark them all dirty so the layering pass unions their
  // old AABBs into the clear region and no stale pixels survive.
  const prevCount = $model.count
  for (let i = 0; i < prevCount; i++) $model.markDirty(i)

  let _writeIdx = 0
  for (let _i = 0; _i < $model.elements.length; _i++) {
    const el = $model.elements[_i]
    const result = $pointFn(el, plugins, _i)
    if (!result) continue   // null/undefined 守卫 — 条件跳过元素
    const descs = Array.isArray(result) ? result : [result]

    for (const desc of descs) {
      // 容量守卫 — 循环扩容直至容纳
      while (_writeIdx >= $model.capacity) $model.grow($model.capacity * 2)

      $model.src[_writeIdx] = _i   // vToM 反查
      // 自描述取值：el.dimX 是字段名，维度值在 el[el.dimX]
      $model.dimX[_writeIdx] = $model.dimXMap.get(String(el[el.dimX])) ?? 0
      $model.dimY[_writeIdx] = $model.dimYMap.get(el.dimY) ?? 0
      $model.value[_writeIdx] = el.value
      $model.type[_writeIdx] = desc.type
      $model.fill[_writeIdx] = desc.fill ?? Hm_palette.defaultFill

      // 非占位符几何参数写 SoA
      const { opts } = desc
      if (opts.w !== undefined && opts.w !== _) $model.w[_writeIdx] = opts.w as number
      if (opts.h !== undefined && opts.h !== _) $model.h[_writeIdx] = opts.h as number
      // aux 槽位物化 — 每原语一张 opts→slot 映射表，单循环收敛写入：
      // Arc: r/startAng/endAng；Triangle: x2/y2；Curve: cp1x/cp1y/bend。
      // 值 undefined 或占位 `_` → NaN 哨兵（消费方按原语语义解读）
      const slots = AUX_SLOTS[desc.type]
      if (slots) {
        const a = _writeIdx * GEO_SLOTS_EACH_ELEM
        for (let s = 0; s < slots.length; s++) {
          const key = slots[s]
          if (key === null) continue
          const v = opts[key]
          $model.aux[a + s] = v === undefined || v === _ ? NaN : (v as number)
        }
      }

      // x/y 占位留给 coord
      $model.x[_writeIdx] = 0
      $model.y[_writeIdx] = 0
      // snap 模式直接定格 anim=1（逐帧重定型场景）；默认 0 走 stepAnim 生长
      $model.anim[_writeIdx] = $model.snapAnim ? 1 : 0
      $model.markDirty(_writeIdx)
      _writeIdx++
    }
  }

  $model.count = _writeIdx
}

// 默认 pointFn
export function defaultPointFn($el: Element, $_plugins: Plugins, $_index: number) {
  return Shapes.rect(DEFAULT_BAR_W, $el.value, Hm_palette.primary)
}
