/**
 * coord — 定位器 + ruler：单遍扫描 value[] 拿 min/max/sum → locator 投影纯位置 x/y
 * （所有原语统一，零 GAP 偏移）→ coordCtx 供 paths/layering 复用；非位置几何归 paths，动画缩放归 render。
 * coordTask 是 dataDirty 触发的一次性任务（engine 在 paths 后清 dataDirty）。
 * 内置规则：'Bar'/'Line'(cartesian) / 'polar'(饼图) / 'radar'(雷达)。
 */
import type { CoordRule, CoordCtx } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_mapRange } from '../helper/maths'
import { ARC_START_ANGLE, RADAR_LABEL_PAD, TAU, VALUE_MAX_EXPAND } from '../helper/const'


/** 雷达有效半径 = min(w,h)/2 − 标签位（单点定义，grid/coord 同源） */
export function radarRadius($w: number, $h: number): number {
  return Math.min($w, $h) / 2 - RADAR_LABEL_PAD
}

// —— cartesian 共享投影（Bar/Line 复用）——

/** 列中心 X — 与网格竖线/标签对齐 */
function cartesianColX($value: number, $dimX: number, $dimY: number, $ctx: CoordCtx): number {
  const colW = $ctx.width / Math.max(1, $ctx.dimXCount)
  return $dimX * colW + colW / 2
}

/** 基线 Y — value 归一化 [0,height] 底部对齐（Rect 约定 y 为顶部） */
function cartesianBaselineY($value: number, $dimX: number, $dimY: number, $ctx: CoordCtx): number {
  const normalized = Hm_mapRange($value, $ctx.valueMin, $ctx.valueMax, 0, $ctx.height)
  return $ctx.height - normalized
}

const builtin: Record<string, CoordRule> = {
  Bar: {
    rule: 'cartesian',
    grid: 'cartesian',
    x: cartesianColX,
    y: cartesianBaselineY
  },

  Line: {
    rule: 'cartesian',
    grid: 'cartesian',
    x: cartesianColX,
    y: cartesianBaselineY
  },

  polar: {
    rule: 'polar',
    grid: 'polar',
    init: { θ: ARC_START_ANGLE },
    x: ($value, $dimX, $dimY, $ctx) => $ctx.width / 2,
    y: ($value, $dimX, $dimY, $ctx) => $ctx.height / 2
  },

  // 雷达 — 按 dimY 分配角度，半径 = value 归一化 × radarRadius（paths 组装三角扇闭合）
  radar: {
    rule: 'cartesian',
    grid: 'radar',
    x: ($value, $dimX, $dimY, $ctx) => {
      const angle = ARC_START_ANGLE + ($dimY / Math.max(1, $ctx.dimYCount)) * TAU
      const r = Hm_mapRange($value, 0, $ctx.valueMax, 0, radarRadius($ctx.width, $ctx.height))
      return $ctx.width / 2 + Math.cos(angle) * r
    },
    y: ($value, $dimX, $dimY, $ctx) => {
      const angle = ARC_START_ANGLE + ($dimY / Math.max(1, $ctx.dimYCount)) * TAU
      const r = Hm_mapRange($value, 0, $ctx.valueMax, 0, radarRadius($ctx.width, $ctx.height))
      return $ctx.height / 2 + Math.sin(angle) * r
    }
  }
}

/** coordTask — dataDirty 触发一次性任务：ruler + 纯位置投影 x/y，coordCtx 供 paths 复用 */
export function coordTask($model: TsuModel, $rule: CoordRule, $viewWidth: number, $viewHeight: number): CoordCtx | null {
  if (!$model.dataDirty) return null

  // 单遍扫描 min / max / sum（polar 角度分配需 sum）
  let _vMin = Infinity
  let _vMax = -Infinity
  let _vSum = 0
  for (let _i = 0; _i < $model.count; _i++) {
    const v = $model.value[_i]
    if (v < _vMin) _vMin = v
    if (v > _vMax) _vMax = v
    _vSum += v
  }
  if (_vMin === _vMax) { _vMax = _vMin + 1 }
  if (_vSum <= 0) _vSum = 1

  // cartesian：Y 从 0 起 + valueMax 上扩 1.2×（hover 缩放留白；radar 留白已内含 radarRadius 跳过）
  if ($rule.rule === 'cartesian') {
    _vMin = 0
    _vMax *= VALUE_MAX_EXPAND
  }


  const ctx: CoordCtx = {
    width: $viewWidth,
    height: $viewHeight,
    count: $model.count,
    dimXCount: $model.dimXMap.size || 1,
    dimYCount: $model.dimYMap.size || 1,
    index: 0,
    valueMin: _vMin,
    valueMax: _vMax,
    valueSum: _vSum,
    init: $rule.init,
  }

  for (let _i = 0; _i < $model.count; _i++) {

    ctx.index = _i
    const dimX = $model.dimX[_i]
    const dimY = $model.dimY[_i]
    const value = $model.value[_i]

    // 纯位置投影（只写 x/y）
    const tx = $rule.x(value, dimX, dimY, ctx)
    const ty = $rule.y(value, dimX, dimY, ctx)

    // 位置只 snap 不动画（缩放动画归 render）
    if ($model.x[_i] !== tx || $model.y[_i] !== ty) {
      $model.x[_i] = tx
      $model.y[_i] = ty
      $model.markDirty(_i)
    }
  }

  return ctx
}

/** 声明（string | fn）→ locator（engine data/resize 时调用） */
export function resolveCoordLocator(
  $rule: string | ((world: { width: number; height: number; dimYCount: number }) => CoordRule),
  $width: number,
  $height: number,
  $dimYCount: number
): CoordRule {
  if (typeof $rule === 'string') {
    return builtin[$rule] ?? builtin.Bar
  }
  return $rule({ width: $width, height: $height, dimYCount: $dimYCount })
}
