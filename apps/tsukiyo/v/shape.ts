/**
 * shape — 图形原语工厂 + point 写入 SoA
 *
 * Shape 是描述符（type + opts + fill），不含数据，由 coord 阶段填充 '_' 占位
 * Bar/Pie/Line/Radar 不是类，而是 coord 规则 + point 映射的组合
 *
 * pointTask 是 SoA 图形数组的唯一写入者：
 *   src/dimX/dimY/value/type/fill/w/h/aux/x/y/anim 全部在此单点物化
 *   （loadElements 只暂存 elements/dim 与维度映射，零 SoA 写入 — 消灭双写）
 */
import type { ShapeDesc, Element, Plugins, CoordVal } from '../yomi'
import { Prim, _ } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_rgba, Hm_palette } from '../helper/maths'
import { DEFAULT_BAR_W, GEO_SLOTS_EACH_ELEM, TAU } from '../helper/const'

// 颜色函数统一从 maths 导入，消除重复实现
export const rgba = Hm_rgba

/**
 * Shape 工厂 — 创建图形描述符。
 * opts 中的 '_' 表示由 coord 阶段填充坐标值。
 */
export function Shape($type: Prim, opts: Record<string, CoordVal> = {}, $fill?: number): ShapeDesc {
  return { type: $type, opts, fill: $fill }
}

// 内置预设 — 常用形状的快捷构造
export const Shapes = {
  rect: ($w: number, $h: number, $fill?: number) => Shape(Prim.Rect, { x: _, y: _, w: $w, h: $h }, $fill),
  circle: ($r: number, $fill?: number) => Shape(Prim.Circle, { x: _, y: _, r: $r }, $fill),
  line: ($fill?: number) => Shape(Prim.Line, { x: _, y: _, x2: _, y2: _ }, $fill),
  arc: ($r: number, $startAng: number, $endAng: number, $fill?: number) =>
    Shape(Prim.Arc, { x: _, y: _, r: $r, startAng: $startAng, endAng: $endAng }, $fill),
  text: ($text: string, $fill?: number) => Shape(Prim.Text, { x: _, y: _, text: $text }, $fill),
  // 曲线 — 与 Line 同源占位（x,y 起点 + w,h Δ偏移），paths 组装 Δ，render 用贝塞尔绘制
  curve: ($fill?: number) => Shape(Prim.Curve, { x: _, y: _, w: _, h: _ }, $fill),
  // 三角形 — 三顶点占位：V_d(x,y) + V_{d+1}(w,h) + C(aux0,aux1)
  // coord 投影写 V_d(x,y)，paths 组装写 V_{d+1}(w,h) 与 C(aux0,aux1)
  triangle: ($fill?: number) =>
    Shape(Prim.Triangle, { x: _, y: _, w: _, h: _, x2: _, y2: _ }, $fill),
}

/**
 * point 回调签名 — 用户自定义每个元素渲染成什么 Shape。
 * (el, plugins) => ShapeDesc | ShapeDesc[]
 */
export type PointFn = (el: Element, plugins: Plugins, index: number) => ShapeDesc | ShapeDesc[]

/**
 * pointTask — 遍历 model.elements，调用 pointFn，将结果写入 SoA。
 * from: model.elements → to: model 的 SoA（src/type/w/h/fill/aux + dimX/dimY/value/x/y/anim）
 * SoA 图形数组的唯一写入点（count 亦在此定稿）。
 */
export function pointTask($model: TsuModel, $pointFn: PointFn): void {
  const plugins: Plugins = {
    vToM: ($slot: number) => $model.vToM($slot),
    mToV: ($query: Partial<Element>) => $model.mToV($query),
  }

  let _writeIdx = 0
  for (let _i = 0; _i < $model.elements.length; _i++) {
    const el = $model.elements[_i]
    const result = $pointFn(el, plugins, _i)
    const descs = Array.isArray(result) ? result : [result]

    for (const desc of descs) {
      // 容量守卫 — 循环扩容直至容纳（多原语展开可超 2 倍容量，单次 grow 会写越界）
      while (_writeIdx >= $model.capacity) $model.grow($model.capacity * 2)

      $model.src[_writeIdx] = _i   // 关联原始元素（vToM 反查）
      // 从 el + dimMap 读取维度坐标与数据值（SoA 唯一物化点）
      // 自描述取值：el.dimX 是字段名，维度值在 el[el.dimX]（基元路径 index=行号 / melt 路径=字段值）
      $model.dimX[_writeIdx] = $model.dimXMap.get(String(el[el.dimX])) ?? 0
      $model.dimY[_writeIdx] = $model.dimYMap.get(el.dimY) ?? 0
      $model.value[_writeIdx] = el.value
      $model.type[_writeIdx] = desc.type
      $model.fill[_writeIdx] = desc.fill ?? Hm_palette.defaultFill  // 默认色

      // 写入非占位符的几何参数到 SoA
      const { opts } = desc
      if (opts.w !== undefined && opts.w !== _) $model.w[_writeIdx] = opts.w as number
      if (opts.h !== undefined && opts.h !== _) $model.h[_writeIdx] = opts.h as number
      // Arc/Circle 用 r（半径）— 写入 aux[0]，render 以 (x,y) 为圆心绘制
      // Arc 的 startAng/endAng 也写入 aux[1]/aux[2]，coord 阶段可覆写
      if (opts.r !== undefined && opts.r !== _) {
        const a = _writeIdx * GEO_SLOTS_EACH_ELEM
        $model.aux[a] = opts.r as number
        $model.aux[a + 1] = (opts.startAng as number) ?? 0
        $model.aux[a + 2] = (opts.endAng as number) ?? TAU
      }
      // Triangle 第三顶点 C 占位 — x2/y2 暂存 aux[0]/aux[1]（占位时初始化为 0）
      // coord 投影写 V_d(x,y)，paths 组装写 V_{d+1}(w,h) 与 C(aux0,aux1)
      if (desc.type === Prim.Triangle) {
        const a = _writeIdx * GEO_SLOTS_EACH_ELEM
        if (opts.x2 !== _ && opts.x2 !== undefined) $model.aux[a] = opts.x2 as number
        if (opts.y2 !== _ && opts.y2 !== undefined) $model.aux[a + 1] = opts.y2 as number
      }

      // x/y 带 '_' 的留给 coord 填充
      $model.x[_writeIdx] = 0
      $model.y[_writeIdx] = 0
      $model.anim[_writeIdx] = 0
      $model.markDirty(_writeIdx)
      _writeIdx++
    }
  }

  $model.count = _writeIdx
}

/** 默认 pointFn — 根据元素生成基础形状（值越大柱越宽） */
export function defaultPointFn($el: Element, $_plugins: Plugins, $_index: number) {
  return Shapes.rect(DEFAULT_BAR_W, $el.value, Hm_palette.primary)
}
