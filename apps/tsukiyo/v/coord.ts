/**
 * coord — 图形定位器 + ruler
 *
 * 职责（per-element 坐标投影，零跨元素）：
 *   1. 单遍扫描 SoA value[] 拿 min/max/sum（ruler，替代独立 Scale 模块）
 *   2. 用 locator 把每个元素的 value 投影到原生坐标 x/y（纯位置，所有原语统一）
 *   3. 构建 coordCtx（含 ruler 结果）返回给 engine，供 paths/layering 复用
 *
 * 所有非位置几何（h/角度/Δ/圆心偏移）由 paths 阶段统一写入
 * 动画缩放由 render 阶段统一应用
 *
 * 内置规则：'Bar'(cartesian) / 'Line'(cartesian) / 'polar'(极坐标饼图) / 'radar'(雷达图)
 * grid meta — 网格背景样式族声明（layering 静态层单源判定，消 isPolar 双源判定）
 * 无 GAP 偏移 — 坐标系与画布坐标完全一致，hover 命中测试无偏移层
 *
 * 时序：coordTask 是 dataDirty 触发的一次性任务（非每帧常驻），
 *   data() 投递 → 下一 tick input 消费 → dataDirty=true → coordTask 执行一次
 *   → 由 engine 在 paths 后清除 dataDirty
 */
import type { CoordRule, CoordCtx } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_mapRange } from '../helper/maths'
import { ARC_START_ANGLE, RADAR_LABEL_PAD, TAU, VALUE_MAX_EXPAND } from '../helper/const'


/**
 * 雷达有效绘制半径 — 单点定义，grid/coord 同源。
 * 半径 = min(w,h)/2 减去标签位，保证 dimY 标签落在画布内。
 */
export function radarRadius($w: number, $h: number): number {
  return Math.min($w, $h) / 2 - RADAR_LABEL_PAD
}

// —— cartesian 共享投影函数（Bar / Line 复用，消除重复）——

/** 列居中 X 投影 — 柱子/折线点画在列中心，与网格竖线/标签对齐 */
function cartesianColX($value: number, $dimX: number, $dimY: number, $ctx: CoordCtx): number {
  const colW = $ctx.width / Math.max(1, $ctx.dimXCount)
  return $dimX * colW + colW / 2
}

/** 基线 Y 投影 — value 归一化到 [0, height]，底部对齐画布底边（render 的 Rect 约定 y 为顶部） */
function cartesianBaselineY($value: number, $dimX: number, $dimY: number, $ctx: CoordCtx): number {
  const normalized = Hm_mapRange($value, $ctx.valueMin, $ctx.valueMax, 0, $ctx.height)
  return $ctx.height - normalized
}

// 内置坐标系规则 — 全部用 valueMin/valueMax 归一化，无 GAP 偏移
const builtin: Record<string, CoordRule> = {
  // 柱状图 — cartesian，底部对齐画布底边
  Bar: {
    rule: 'cartesian',
    grid: 'cartesian',
    x: cartesianColX,
    y: cartesianBaselineY
  },

  // 折线图 — cartesian，每个点 y 由 value 归一化决定（与 Bar 共享投影函数）
  Line: {
    rule: 'cartesian',
    grid: 'cartesian',
    x: cartesianColX,
    y: cartesianBaselineY
  },

  // 极坐标 — 饼图（所有扇形圆心在画布中心）
  polar: {
    rule: 'polar',
    grid: 'polar',
    init: { θ: ARC_START_ANGLE },
    x: ($value, $dimX, $dimY, $ctx) => $ctx.width / 2,
    y: ($value, $dimX, $dimY, $ctx) => $ctx.height / 2
  },

  // 雷达图 — cartesian 归一化，按 dimY 分配角度，按 value 算半径
  // 半径从 0 起算（圆心=0），radarR 含标签位，内置闭合（paths 组装三角扇）
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

/**
 * coordTask — dataDirty 触发的一次性任务，由 scheduler tick 在 dataDirty=true 时执行。
 * 单遍循环完成 ruler + per-element 坐标投影（纯位置 x/y）。
 * 构建 coordCtx 返回给 engine，供 paths 复用 ruler 结果。
 *
 * 所有非位置几何（Rect h / Arc 角度 / Line Δ / Triangle 偏移）由 pathsTask 写入。
 */
export function coordTask($model: TsuModel, $rule: CoordRule, $viewWidth: number, $viewHeight: number): CoordCtx | null {
  if (!$model.dataDirty) return null

  // 单遍扫描 — 同时拿 min / max / sum（polar 角度分配需要 sum）
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

  // cartesian — Y 轴从 0 起（柱子表示从 0 到 value 的量，比例真实）
  // valueMax 上扩 20%，为柱子/折线 hover 缩放（1.05x）预留空间
  // radar 半径从 0 起算且点 hover 做径向外凸，留白由 radarR 内含，跳过 1.2× 避免外圈恒空
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

    // 纯位置投影 — 所有原语统一，只写 x/y
    const tx = $rule.x(value, dimX, dimY, ctx)
    const ty = $rule.y(value, dimX, dimY, ctx)

    // 位置 snap 到目标 — 位置不做动画，只 snap（动画缩放由 render 阶段统一应用）
    if ($model.x[_i] !== tx || $model.y[_i] !== ty) {
      $model.x[_i] = tx
      $model.y[_i] = ty
      $model.markDirty(_i)
    }
  }

  // dataDirty 由 engine 在 paths 之后统一清除 — coord 不越权管理全局标志
  return ctx
}


/**
 * 解析坐标定位规则 — 声明（string | fn）→ locator（engine data/resize 时调用）
 */
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
