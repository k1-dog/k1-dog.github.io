/**
 * shape — 图形原语工厂 + point 写入 SoA：
 * Shape = 描述符（type + opts + fill），'_' 占位由 coord 填充；
 * pointTask 是 SoA 图形数组唯一写入者（src/dimX/dimY/value/type/fill/w/h/aux/x/y/anim 单点物化）
 */
import type { ShapeDesc, Element, Plugins, CoordVal } from '../yomi'
import { Prim, _ } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_rgba, Hm_palette } from '../helper/maths'
import { DEFAULT_BAR_W, GEO_SLOTS_EACH_ELEM, TAU } from '../helper/const'

export const rgba = Hm_rgba

// Shape 工厂 — '_' 占位由 coord 填充
export function Shape($type: Prim, opts: Record<string, CoordVal> = {}, $fill?: number): ShapeDesc {
  return { type: $type, opts, fill: $fill }
}

export const Shapes = {
  rect: ($w: number, $h: number, $fill?: number) => Shape(Prim.Rect, { x: _, y: _, w: $w, h: $h }, $fill),
  circle: ($r: number, $fill?: number) => Shape(Prim.Circle, { x: _, y: _, r: $r }, $fill),
  line: ($fill?: number) => Shape(Prim.Line, { x: _, y: _, x2: _, y2: _ }, $fill),
  // arc — 角度传 `_`（占位）交系统按 value 比例分配（饼图扇段）；显式角度 = 固定扇（散点满圆）
  arc: ($r: number, $startAng: CoordVal, $endAng: CoordVal, $fill?: number) =>
    Shape(Prim.Arc, { x: _, y: _, r: $r, startAng: $startAng, endAng: $endAng }, $fill),
  // sector — 扇段语法糖（arc 角度占位派生）：角度交 paths 按 value 比例分配（饼图语义，用户零 `_` 依赖）
  sector: ($r: number, $fill?: number) =>
    Shape(Prim.Arc, { x: _, y: _, r: $r, startAng: _, endAng: _ }, $fill),
  text: ($text: string, $fill?: number) => Shape(Prim.Text, { x: _, y: _, text: $text }, $fill),
  // 曲线 — 与 Line 同源占位（x,y 起点 + w,h Δ偏移），paths 组装 Δ
  curve: ($fill?: number) => Shape(Prim.Curve, { x: _, y: _, w: _, h: _ }, $fill),
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
      // Arc/Circle r → aux[0]；startAng/endAng → aux[1]/aux[2]；角度占位 `_` 写 NaN 哨兵（paths 按值分配）
      if (opts.r !== undefined && opts.r !== _) {
        const a = _writeIdx * GEO_SLOTS_EACH_ELEM
        $model.aux[a] = opts.r as number
        $model.aux[a + 1] = opts.startAng === _ ? NaN : (opts.startAng as number) ?? 0
        $model.aux[a + 2] = opts.endAng === _ ? NaN : (opts.endAng as number) ?? TAU
      }
      // Triangle 第三顶点 C — x2/y2 → aux[0]/aux[1]
      if (desc.type === Prim.Triangle) {
        const a = _writeIdx * GEO_SLOTS_EACH_ELEM
        if (opts.x2 !== _ && opts.x2 !== undefined) $model.aux[a] = opts.x2 as number
        if (opts.y2 !== _ && opts.y2 !== undefined) $model.aux[a + 1] = opts.y2 as number
      }

      // x/y 占位留给 coord
      $model.x[_writeIdx] = 0
      $model.y[_writeIdx] = 0
      $model.anim[_writeIdx] = 0
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
