/**
 * coord — 定位器：单遍扫描 value[]/x 值域拿 min/max/sum → 轴投影纯位置 x/y
 * （所有原语统一，零 GAP 偏移）→ CoordCtx 供 paths/layering 复用；非位置几何归 paths，动画缩放归 render。
 * coordTask 是 dataDirty 触发的一次性任务（engine 在 paths 后清 dataDirty）。
 * Axis 组合子（轴原语）：坐标系 = 两根轴（域 kind + 投影 at）组装，不是独立类。
 * 内置 preset：'Bar'/'Line'/'polar'/'radar' 仅是预制组合（builtin 查表），可通过 resolveCoordLocator 传入自定义定位器或工厂。
 */
import type { AxisRule, CoordCtx, CoordRule, Element, ITsukiyoLocator } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_mapRange } from '../helper/maths'
import { ARC_START_ANGLE, RADAR_LABEL_PAD, TAU, VALUE_MAX_EXPAND } from '../helper/const'


/** 雷达有效半径 = min(w,h)/2 − 标签位（单点定义，grid/coord 同源） */
export function radarRadius($w: number, $h: number): number {
  return Math.min($w, $h) / 2 - RADAR_LABEL_PAD
}

// —— 轴切片（预组装原语）——

/** 列中心 X — 与网格竖线/标签对齐（cat 域） */
function cartesianColX($el: Element, $dimX: number, $dimY: number, $ctx: CoordCtx): number {
  const colW = $ctx.width / Math.max(1, $ctx.dimXCount)
  return $dimX * colW + colW / 2
}

/** 基线 Y — value 归一化 [0,height] 底部对齐（Rect 约定 y 为顶部） */
function cartesianBaselineY($el: Element, $dimX: number, $dimY: number, $ctx: CoordCtx): number {
  const normalized = Hm_mapRange($el.value, $ctx.valueMin, $ctx.valueMax, 0, $ctx.height)
  return $ctx.height - normalized
}

// —— Axis 组合子：轴原语工厂（kind + at 内聚单对象）——
/** Axis 配件包 — 预组装轴切片 + 组合子（图表类型 = 轴组合，非独立类） */
export interface AxisKit {
  catX: AxisRule
  baseY: AxisRule
  polarX: AxisRule
  polarY: AxisRule
  radarX: AxisRule
  radarY: AxisRule
  x: ($fX?: string) => AxisRule
  y: ($fY?: string) => AxisRule
  xy: ($fX?: string, $fY?: string) => ITsukiyoLocator
}
export const Axis: AxisKit = {
  /** 分类 X 轴 — 列中心等距（Bar/Line preset） */
  catX: { kind: 'cat', at: cartesianColX },
  /** 基线 Y 轴 — value 归一化高度（Bar/Line preset） */
  baseY: { kind: 'num', at: cartesianBaselineY },
  /** 极坐标 X — 恒画布中心（polar preset） */
  polarX: { kind: 'cat', at: ($_el: Element, $_dimX: number, $_dimY: number, $ctx: CoordCtx) => $ctx.width / 2 },
  /** 极坐标 Y — 恒画布中心（polar preset） */
  polarY: { kind: 'cat', at: ($_el: Element, $_dimX: number, $_dimY: number, $ctx: CoordCtx) => $ctx.height / 2 },
  /** 雷达 X — 按 dimY 分配角度 + value 归一化半径（radar preset） */
  radarX: { kind: 'cat', at: ($el: Element, $dimX: number, $dimY: number, $ctx: CoordCtx) => {
    const angle = ARC_START_ANGLE + ($dimY / Math.max(1, $ctx.dimYCount)) * TAU
    const r = Hm_mapRange($el.value, 0, $ctx.valueMax, 0, radarRadius($ctx.width, $ctx.height))
    return $ctx.width / 2 + Math.cos(angle) * r
  } },
  /** 雷达 Y — 按 dimY 分配角度 + value 归一化半径（radar preset） */
  radarY: { kind: 'cat', at: ($el: Element, $dimX: number, $dimY: number, $ctx: CoordCtx) => {
    const angle = ARC_START_ANGLE + ($dimY / Math.max(1, $ctx.dimYCount)) * TAU
    const r = Hm_mapRange($el.value, 0, $ctx.valueMax, 0, radarRadius($ctx.width, $ctx.height))
    return $ctx.height / 2 + Math.sin(angle) * r
  } },

  /** 数值 X 轴原语 — 字段值连续线性映射 [0,width]；$fX 缺省取 el[el.dimX]（默认 dimX 字段） */
  x: ($fX?: string): AxisRule => ({
    kind: 'num',
    field: $fX,
    at: ($el: Element, $_dimX: number, $_dimY: number, $ctx: CoordCtx) =>
      Hm_mapRange($el[$fX ?? $el.dimX], $ctx.xMin ?? 0, $ctx.xMax ?? 1, 0, $ctx.width),
  }),
  /** 数值 Y 轴原语 — 字段值连续线性映射 [height,0]（Y 翻转）；$fY 缺省取 el.value */
  y: ($fY?: string): AxisRule => ({
    kind: 'num',
    field: $fY,
    at: ($el: Element, $_dimX: number, $_dimY: number, $ctx: CoordCtx) =>
      $ctx.height - Hm_mapRange($el[$fY ?? 'value'], $ctx.valueMin, $ctx.valueMax, 0, $ctx.height),
  }),

  /** 散点组合子 — 双数值连续轴（X 字段可选，缺省取 el[el.dimX]；Y 字段可选，缺省取 el.value） */
  xy: ($fX?: string, $fY?: string): ITsukiyoLocator => ({
    x: Axis.x($fX),
    y: Axis.y($fY),
    grid: 'cartesian',
    init: { y0: false },   // 连续值域 — 不打 0 基线，用真实 min/max
  }),
}

// —— 内置组合表（预组装语法糖：一行一个 preset）——
const builtin: Record<string, ITsukiyoLocator> = {
  Bar: {
    x: Axis.catX,
    y: Axis.baseY,
    grid: 'cartesian',
  },
  Line: {
    x: Axis.catX,
    y: Axis.baseY,
    grid: 'cartesian',
  },
  polar: {
    x: Axis.polarX,
    y: Axis.polarY,
    grid: 'polar',
    init: { θ: ARC_START_ANGLE },
  },
  radar: {
    x: Axis.radarX,
    y: Axis.radarY,
    grid: 'radar',
  },
}

/** coordTask — dataDirty 触发一次性任务：ruler（值域单遍扫描）+ 轴投影纯位置 x/y，CoordCtx 供 paths 复用 */
export function coordTask($model: TsuModel, $locator: ITsukiyoLocator, $viewWidth: number, $viewHeight: number): CoordCtx | null {
  if (!$model.dataDirty) return null

  // 单遍扫描 min / max / sum（polar 角度分配需 sum）；x 数值域顺带统计（x.kind='num'）
  let _vMin = Infinity
  let _vMax = -Infinity
  let _vSum = 0
  let _xMin = Infinity
  let _xMax = -Infinity
  const xAxis = $locator.x
  for (let _i = 0; _i < $model.count; _i++) {
    const v = $model.value[_i]
    if (v < _vMin) _vMin = v
    if (v > _vMax) _vMax = v
    _vSum += v
    if (xAxis.kind === 'num') {
      const el = $model.elements[$model.src[_i]]
      if (!el) continue
      const xv = Number(el[xAxis.field ?? el.dimX])
      if (xv < _xMin) _xMin = xv
      if (xv > _xMax) _xMax = xv
    }
  }
  if (_vMin === _vMax) { _vMax = _vMin + 1 }
  if (_vSum <= 0) _vSum = 1
  if (_xMin === _xMax) { _xMax = _xMin + 1 }   // X 单值保护

  // Y 值域归一：init.y0（缺省 true）→ 0 起 + valueMax 上扩 1.2×（柱/线/雷达留白；散点 init.y0=false 用真实 min/max）
  const y0 = $locator.init?.y0 !== false
  if (y0) {
    _vMin = 0
    _vMax *= VALUE_MAX_EXPAND
  }

  const ctx: CoordCtx = {
    width: $viewWidth,
    height: $viewHeight,
    count: $model.count,
    dimXCount: $model.dimXMap.size || 1,
    dimYCount: $model.dimYMap.size || 1,
    valueMin: _vMin,
    valueMax: _vMax,
    valueSum: _vSum,
    xMin: xAxis.kind === 'num' ? _xMin : undefined,
    xMax: xAxis.kind === 'num' ? _xMax : undefined,
  }

  for (let _i = 0; _i < $model.count; _i++) {
    const el = $model.elements[$model.src[_i]]
    if (!el) continue
    const dimX = $model.dimX[_i]
    const dimY = $model.dimY[_i]

    // 纯位置投影（只写 x/y）
    const tx = $locator.x.at(el, dimX, dimY, ctx)
    const ty = $locator.y.at(el, dimX, dimY, ctx)

    // 位置只 snap 不动画（缩放动画归 render）
    if ($model.x[_i] !== tx || $model.y[_i] !== ty) {
      $model.x[_i] = tx
      $model.y[_i] = ty
      $model.markDirty(_i)
    }
  }

  return ctx
}

/** 声明（name | locator | fn）→ 定位器（解析 + 投影 + 挂 ctx 单点完成；engine coord task 调用） */
export function resolveCoordLocator(
  $rule: CoordRule,
  $model: TsuModel,
  $width: number,
  $height: number,
): ITsukiyoLocator {
  let _loc: ITsukiyoLocator
  if (typeof $rule === 'string') {
    const preset = builtin[$rule]
    if (!preset) {
      console.warn(`[tsukiyo] 未知 coord 名称 "${$rule}"，回退默认 Bar`)
      _loc = { ...builtin.Bar }
    } else {
      _loc = { ...preset }   // 浅拷贝 — 多 Engine 共享 preset 防 ctx 污染（轴函数纯函数复用）
    }
  } else if (typeof $rule === 'function') {
    _loc = $rule({ width: $width, height: $height, dimYCount: $model.dimYMap.size || 1 })
  } else {
    _loc = $rule
  }
  _loc.ctx = coordTask($model, _loc, $width, $height)
  return _loc
}