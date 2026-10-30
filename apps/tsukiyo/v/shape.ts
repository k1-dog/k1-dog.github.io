/**
 * v/shape — shape 阶段：图形定型 + 形状注册；一个形状 = 一个 ShapeSpec（九字段封顶）
 * Shapes.custom 返回同级工厂闭包——零全局注册表、可 tree-shake、多实例安全
 * （内置形状同走此路径——dogfooding）；本阶段只写定型几何：位置归 coord、跨图形封闭归 paths
 */
import type { ShapeDesc, ShapeSpec, Element, Plugins, CoordCtx, Box as BoxT } from '../yomi'
import { _ } from '../yomi'
import type { TsuModel } from '../m/model'
import { Pen } from './pen'
import { Hm_rgba, Hm_color, Hm_map } from '../helper/maths'
import { DEFAULT_BAR_W, TAU, ARC_GAP_EPS, CURVE_NORMAL_RATIO, CURVE_BEND_MAX_PX } from '../helper/const'

export const rgba = Hm_rgba

/**
 * 生长函数 — 值 → 局部尺寸（缺省不生长）
 * 值到像素的换算统一在这里完成：grow 是唯一的「值 → 尺寸」hook、
 * 于是 spec 只声明生长轴、不需要在 geo 里猜数据单位
 */
export const Grow = {
  /** 柱 — 高度 = 值映射到 [0, h]、锚点即数据点 y、柱身向下画 */
  y: ($v: number, $e: BoxT, $c: CoordCtx): void => {
    $e.h = Hm_map($v, $c.v0, $c.v1, 0, $c.h)
  },
  /** 径向 — 半径 = 值映射到 [0, min(w,h)/2]（玫瑰） */
  r: ($v: number, $e: BoxT, $c: CoordCtx): void => {
    $e.r = Hm_map($v, $c.v0, $c.v1, 0, Math.min($c.w, $c.h) / 2)
  },
}

/**
 * 补间推导 — 局部盒按进度 p 改写（形状语义各自不同、这就是"统一配置"）
 * 用户可用 ShapeSpec.tween 覆盖任意一种
 */
export function tweenBox($spec: ShapeSpec, $e: BoxT, $p: number): void {
  if ($spec.tween) { $spec.tween($e, $p); return }
  switch ($spec.kind) {
    /** 柱 — 底边固定、向上长高（geo 原点在柱底中心、缩放即长高） */
    case 'rect':
      $e.h *= $p
      return
    /** 圆 / 环 — 半径放大 */
    case 'circle':
    case 'ring':
      $e.r *= $p
      return
    /** 线 / 曲线 — 沿线走向伸张（不是纵向长高） */
    case 'line':
    case 'curve':
      $e.w *= $p
      $e.h *= $p
      return
    /** 弧 / 扇 — 角度扫掠（半径恒定、饼图与玫瑰的正确观感） */
    case 'arc': {
      const span = $e.endAng - $e.startAng
      $e.endAng = $e.startAng + span * $p
      return
    }
    /** 三角扇 — 径向伸展 */
    case 'triangle':
      $e.w *= $p
      $e.h *= $p
      $e.ax = ($e.ax ?? 0) * $p
      $e.ay = ($e.ay ?? 0) * $p
      return
    default:
      return
  }
}

// —— 注册表 ——
// id 是 shape 阶段写入 SoA 的唯一定型标识；0 恒为默认（rect）
const REG: ShapeSpec[] = []
export const DEFAULT_SHAPE_ID = 0

/** 注册一个形状、返回与 Shapes.rect 同级的工厂闭包 */
export function registerShape($spec: ShapeSpec): ($opts?: Record<string, number>, $fill?: number) => ShapeDesc {
  const id = REG.length
  REG.push($spec)
  return ($opts?: Record<string, number>, $fill?: number): ShapeDesc => ({ id, opts: $opts, fill: $fill })
}

/** id → spec（render / spatial / paths 读取声明） */
export function specOf($id: number): ShapeSpec | undefined {
  return REG[$id]
}

// —— 内置形状：全部由同一份 spec 描述（与用户自定义走同一路径）——

// 原点约定（唯一来源 = geo 自己）：局部坐标的 (0,0) 就是锚点
// 于是 render 只做一次 translate(x, y)、框架不再有 center / baseBottom 开关

/**
 * 矩形 — 原点在锚点（= 数据点的 y、即柱顶）、柱身向下画
 * 与 `Axis.v`（底边向上度量）配合：锚点天然落在数值高度上、
 * 值越大锚点越高、柱身再向下补到基线tween 只收缩 h
 */
const rect = registerShape({
  kind: 'rect',
  fill: true,
  three: 'box',
  grow: Grow.y,
  slots: { w: DEFAULT_BAR_W },
  geo: ({ w, h }, $o) => { $o.rect(-w / 2, 0, w, h) },
})

/** 圆 — 原点即圆心 */
const circle = registerShape({
  kind: 'circle',
  fill: true,
  slots: { r: 4 },
  geo: ({ r }, $o) => { $o.moveTo(r, 0); $o.arc(0, 0, r, 0, TAU) },
})

/** 线段 — 连本槽锚点到 Δ 目标（w/h 是相对偏移） */
const line = registerShape({
  kind: 'line',
  three: 'bar',
  slots: {},
  geo: ({ w, h }, $o) => { $o.moveTo(0, 0); $o.lineTo(w, h) },
})

/** 弧 / 扇形 — 原点即圆心；startAngle / endAngle 为 NaN 时由 paths 按值比切分 */
const arc = registerShape({
  kind: 'arc',
  fill: true,
  three: 'sector',
  slots: { r: 60, startAng: NaN, endAng: NaN },
  geo: ({ r, startAng, endAng }, $o) => {
    const from = Number.isFinite(startAng) ? startAng : 0
    const to = Number.isFinite(endAng) ? endAng : TAU
    $o.moveTo(0, 0)
    $o.arc(0, 0, r, from - ARC_GAP_EPS, to + ARC_GAP_EPS)
    $o.closePath()
  },
})

/** 环 — 原点即圆心（涟漪 / 光晕语义） */
const ring = registerShape({
  kind: 'ring',
  slots: { r: 4 },
  geo: ({ r }, $o) => { $o.moveTo(r, 0); $o.arc(0, 0, r, 0, TAU) },
})

/** 文字 — 唯一无法 Path2D 化的形状（render 直接 fillText） */
const text = registerShape({
  kind: 'text',
  text: true,
  slots: { size: 0 },
  geo: () => { /* 文字走 fillText——无路径 */ },
})

/** 曲线 — 控制点缺省时按 bend 比例沿段法向生成 */
const curve = registerShape({
  kind: 'curve',
  // bend 默认 0.2（不是 NaN）：缺省弯度是形状语义、不该依赖 isFinite 兜底
  slots: { bend: 0.2, cp1x: NaN, cp1y: NaN, cp2x: NaN, cp2y: NaN },
  geo: ({ w, h, bend, cp1x, cp1y, cp2x, cp2y, ox, oy }, $o) => {
    // 段从锚点起步——路径为空时 canvas 会从第一个控制点起子路径、静默画出半条曲线
    $o.moveTo(0, 0)
    if (Number.isFinite(cp1x) && Number.isFinite(cp1y) && Number.isFinite(cp2x) && Number.isFinite(cp2y)) {
      // 控制点为图表绝对坐标 → 换算到局部（ox/oy 由 paths 阶段填入）
      const lx = cp1x - (ox ?? 0)
      const ly = cp1y - (oy ?? 0)
      const rx = cp2x - (ox ?? 0)
      const ry = cp2y - (oy ?? 0)
      $o.bezierCurveTo(lx, ly, rx, ry, w, h)
      return
    }
    // 控制点 = 段中点沿法向偏移、幅度 ∝ 段长（缺省弯度带像素上限：
    // 长段按比例会鼓成巨弧、如回绕闭合段 / 跨图形桥接段）
    // 与段的方向无关（横段/竖段同样的弯度）、因此云幕连线、雨滴焰尾都保持平滑弧
    const n = Math.hypot(w, h) || 1
    const a = Math.min(n * (Number.isFinite(bend) ? bend : CURVE_NORMAL_RATIO), CURVE_BEND_MAX_PX)
    const cx = w / 2 + (-h / n) * a
    const cy = h / 2 + (w / n) * a
    $o.quadraticCurveTo(cx, cy, w, h)
  },
})

/**
 * 三角 — 雷达扇区：V0 是本槽锚点、V1 是下一片锚点、V2 是视图中心
 * ax/ay 由 paths 写入（U 形布局、不依赖 isFinite 兜底：写不到就是 0 面积、暴露问题）
 */
const triangle = registerShape({
  kind: 'triangle',
  fill: true,
  slots: { ax: 0, ay: 0 },
  geo: ({ w, h, ax, ay }, $o) => {
    $o.moveTo(0, 0)
    $o.lineTo(w, h)
    $o.lineTo(ax, ay)
    $o.closePath()
  },
})

/**
 * 形状工厂 — 与 AntV registerShape 的闭包形式等价——但：
 * 拿到的是「局部盒」而非绝对像素、框架自动接管 AABB / 命中 / 生长
 */
export const Shapes = {
  /** 自定义形状 — 返回与 rect 同级的工厂 */
  custom: registerShape,

  /** 柱 — 原点在柱底中心 */
  rect: ($w = DEFAULT_BAR_W, $fill?: number) =>
    ({ id: 0, opts: { w: $w }, fill: $fill } as ShapeDesc),
  circle: ($r: number, $fill?: number) => ({ id: 1, opts: { r: $r }, fill: $fill } as ShapeDesc),
  line: ($fill?: number) => ({ id: 2, opts: {}, fill: $fill } as ShapeDesc),
  arc: ($r: number, $startAng: number, $endAng: number, $fill?: number) =>
    ({ id: 3, opts: { r: $r, startAng: $startAng, endAng: $endAng }, fill: $fill } as ShapeDesc),
  sector: ($r: number, $fill?: number) =>
    ({ id: 3, opts: { r: $r, startAng: NaN, endAng: NaN }, fill: $fill } as ShapeDesc),
  ring: ($r: number, $fill?: number) => ({ id: 4, opts: { r: $r }, fill: $fill } as ShapeDesc),
  text: ($fill?: number) => ({ id: 5, opts: {}, fill: $fill } as ShapeDesc),
  curve: ($fill?: number, $cp1?: [number, number], $cp2?: [number, number], $bend?: number) =>
    ({
      id: 6,
      opts: {
        cp1x: $cp1?.[0] ?? NaN, cp1y: $cp1?.[1] ?? NaN,
        cp2x: $cp2?.[0] ?? NaN, cp2y: $cp2?.[1] ?? NaN,
        bend: $bend ?? NaN,
      },
      fill: $fill,
    } as ShapeDesc),
  triangle: ($fill?: number) => ({ id: 7, opts: {}, fill: $fill } as ShapeDesc),
}

/** 兼容旧写法 — Shape(id, opts, fill) 直接指定注册序号 */
export function Shape($id: number, $opts: Record<string, number> = {}, $fill?: number): ShapeDesc {
  return { id: $id, opts: $opts, fill: $fill }
}

export type { ShapeFn } from '../yomi'

/** 复用的记录画笔 */
const pen = new Pen()

/**
 * shape 阶段 — 把每个元素的形状声明物化到 SoA 槽位（本阶段是唯一写入者）
 * 写入：src / dimX / dimY / value / id / fill / w / h / aux / bounds / paths
 */
export function shape($model: TsuModel, $shapeFn: ShapeFn, $ctx: CoordCtx): true {
  const empty: CoordCtx = { w: 0, h: 0, dX: 1, dY: 1, v0: 0, v1: 1, vΣ: 1 }
  const ctx = $ctx ?? empty
  const plugins: Plugins = {
    vToM: ($slot: number) => $model.vToM($slot),
    mToV: ($query: Partial<Element>) => $model.mToV($query),
  }

  let _slot = 0
  const els = $model.elements
  for (let _i = 0; _i < els.length; _i++) {
    const el = els[_i]
    const result = $shapeFn(el, plugins, _i, ctx)
    if (!result) continue
    const descs = Array.isArray(result) ? result : [result]

    for (const desc of descs) {
      const spec = specOf(desc.id)
      if (!spec) continue
      $model.reserve(_slot + 1)

      $model.src[_slot] = _i
      $model.dimX[_slot] = $model.dimXMap.get(String(el[el.dimX])) ?? 0
      $model.dimY[_slot] = $model.dimYMap.get(el.dimY) ?? 0
      $model.value[_slot] = el.value
      $model.id[_slot] = desc.id
      $model.fill[_slot] = desc.fill ?? Hm_color.fill
      $model.x[_slot] = Number.NaN
      $model.y[_slot] = Number.NaN

      // 参数落 aux —— spec.slots 顺序即槽序、缺省取默认值
      const a = _slot * 5
      const defaults = spec.slots ?? {}
      let _s = 0
      for (const key in defaults) {
        const v = desc.opts?.[key]
        $model.aux[a + _s] = v !== undefined ? v : defaults[key]
        _s++
        if (_s >= 5) break
      }
      for (; _s < 5; _s++) $model.aux[a + _s] = Number.NaN

      // 定型尺寸 — w 由 slots.w 提供（缺省取 DEFAULT_BAR_W）、h 在 paths 阶段按值求
      const wv = desc.opts?.w
      $model.w[_slot] = wv !== undefined && wv !== (_ as unknown)
        ? wv
        : (defaults.w ?? DEFAULT_BAR_W)
      $model.h[_slot] = 0
      // anim 由 anim 阶段独占（grow / reset）—— shape 只声明 λDelay 的负偏移意图、
      // 通过 delayOf 记录在 aux 之外的旁路数组、避免每 tick 覆写生长进度
      $model.λ[_slot] = Number.isFinite(spec.λDelay) ? (spec.λDelay as number) : 0

      _slot++
    }
  }

  $model.count = _slot
  $model.gen++
  return true
}

/**
 * 从 SoA 收集槽位局部盒、套用补间后返回（供 render 生长时重跑 geo）
 * 参数来自 aux（spec.slots 顺序）+ w/h；ox/oy 是锚点
 */
export function rebuildBox($m: TsuModel, $ξ: number, $spec: ShapeSpec, $p: number): Record<string, number> {
  const a = $ξ * 5
  const defaults = $spec.slots ?? {}
  const box: Record<string, number> = {}
  let _s = 0
  for (const key in defaults) {
    box[key] = $m.aux[a + _s]
    _s++
    if (_s >= 5) break
  }
  box.w = $m.w[$ξ]
  box.h = $m.h[$ξ]
  box.ox = $m.x[$ξ]
  box.oy = $m.y[$ξ]
  tweenBox($spec, box as any, $p > 0 ? $p : 0)
  return box
}

export function defaultShapeFn($_$el: Element): ShapeDesc {
  return Shapes.rect(DEFAULT_BAR_W, Hm_color.fill)
}

/** 供 layering / grid 复用的画笔 */
export { pen as shapePen }
export type { ShapeSpec, BoxT as Box }
