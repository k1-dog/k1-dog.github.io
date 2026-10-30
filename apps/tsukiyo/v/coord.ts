/**
 * v/coord — coord 阶段：纯投影；scale 已产出 CoordCtx（值域 / 维度数）、
 * 本阶段只做逐槽投影（x/y = proj(el, ctx, iX, iY)）与锚点归一（形状声明 anchor 时换算左上角）
 * 零标脏、零动画、零域扫描
 */
import type { CoordCtx, CoordRule, ITsukiyoLocator, Proj } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_map } from '../helper/maths'
import { ARC_START_ANGLE, GEO_SLOTS_EACH_ELEM, RADAR_LABEL_PAD, TAU } from '../helper/const'

/** radar 有效半径（与 grid 共用同一来源） */
export function radarR($w: number, $h: number): number {
  return Math.min($w, $h) / 2 - RADAR_LABEL_PAD
}

/** 单个 band 区间：序号 k / 总数 n → 归一化 [0,1] */
export type Band = (k: number, n: number) => [number, number]

export const Band = {
  /** 等分 — 默认 */
  even: (($k: number, $n: number): [number, number] => [$k / $n, ($k + 1) / $n]) as Band,
  /** 权重不等分 — 权重数组一次声明解决"不同组间距不同" */
  w: ($ws: number[]): Band => {
    const sum = $ws.reduce(($a, $b) => $a + $b, 0) || 1
    const acc = [0]
    for (const w of $ws) acc.push(acc[acc.length - 1] + w)
    return ($k: number) => [acc[$k] / sum, acc[$k + 1] / sum]
  },
  /** 极坐标角度带 — 玫瑰 / 极坐标分组 */
  polar: (($k: number, $n: number): [number, number] => [($k / $n) * TAU, (($k + 1) / $n) * TAU]) as Band,
}

/**
 * 轴投影 — 五个纯函数、覆盖全部内置布局
 * 任何自定义定位直接写 `(el, ctx, iX, iY) => number`、无需新增组合子
 */
export const Axis: Record<'band' | 'v' | 'x' | 'angle' | 'rad' | 'cx' | 'cy', Proj> = {
  /** 分类轴 — dY > 1 时列内自动分组（零配置） */
  band: ($_el, $c, $iX, $iY) =>
    (($iX + ($c.dY > 1 ? ($iY + 0.5) / $c.dY : 0.5)) / $c.dX) * $c.w,

  /** 值轴 — 从底边向上 */
  v: ($el, $c) => $c.h - Hm_map($el.value, $c.v0, $c.v1, 0, $c.h),

  /**
   * 数值 x 轴 — 只接受显式 dom 声明：读 `el[ctx.domX]` 并在 `[x0, x1]` 上线性投影
   * 未声明 dom.x 时不做任何猜测（返回 NaN）、由 resolveLocator 给出告警：
   * 数值轴必须写 `.coord({ x: Axis.x, dom: { x: 'field' } })`
   */
  x: ($el, $c) => {
    if ($c.domX === undefined || $c.x0 === undefined || $c.x1 === undefined) return NaN
    const raw = Number($el[$c.domX])
    return Number.isFinite(raw) ? Hm_map(raw, $c.x0, $c.x1, 0, $c.w) : NaN
  },

  /** 极角 — 按 dimY 均分、12 点钟起 */
  angle: ($_el, $c, $_$iX, $iY) => ($iY / $c.dY) * TAU - Math.PI / 2,

  /** 极径 — 值 → 半径 */
  rad: ($el, $c) => Hm_map($el.value, 0, $c.v1, 0, radarR($c.w, $c.h)),

  /** 常量轴 — 圆心 / 原点 */
  cx: ($_el, $c) => $c.w / 2,
  cy: ($_el, $c) => $c.h / 2,
}

/** radar 成对常量 — 同一套 cos/sin 推导 */
function radarPair($dim: 'x' | 'y'): Proj {
  return ($el, $c, $_$iX, $iY) => {
    const ang = ARC_START_ANGLE + ($iY / Math.max(1, $c.dY)) * TAU
    const r = Hm_map($el.value, 0, $c.v1, 0, radarR($c.w, $c.h))
    return $dim === 'x'
      ? $c.w / 2 + Math.cos(ang) * r
      : $c.h / 2 + Math.sin(ang) * r
  }
}

export const Radar: Record<'x' | 'y', Proj> = { x: radarPair('x'), y: radarPair('y') }

// —— 唯一简写 ——
// 图表类型是「投影的组合」不是类——只保留 Bar（分类 × 值）一条简写、其余用函数组合：
// 饼/玫瑰 Axis.cx/cy、散点 Axis.x + Axis.v + dom.x、雷达 Radar.x/y + grid: 'radar'
const BAND_VALUE: ITsukiyoLocator = { x: Axis.band, y: Axis.v, grid: 'cartesian' }
const BUILTIN: Record<string, ITsukiyoLocator> = { Bar: BAND_VALUE }

/** 声明（名 | locator | 工厂）→ locator（纯解析） */
export function resolveLocator($rule: CoordRule, $w: number, $h: number, $dY: number): ITsukiyoLocator {
  if (typeof $rule === 'string') {
    const preset = BUILTIN[$rule]
    if (!preset) {
      console.warn(`[tsukiyo] unknown coord "${$rule}" — falling back to Bar`)
      return { ...BAND_VALUE, ctx: null }
    }
    return { ...preset, ctx: null }
  }
  if (typeof $rule === 'function') return $rule({ width: $w, height: $h, dimYCount: $dY })
  // 数值轴必须显式声明域字段 —— 写错就报错、不做静默兜底
  if ($rule.x === Axis.x && $rule.dom?.x === undefined) {
    console.warn('[tsukiyo] Axis.x requires dom: { x: "<field>" } — anchors will be NaN')
  }
  return $rule
}

/**
 * coord 阶段 — 纯投影：逐槽求 x/y、再按形状声明的 anchor 归一
 */
export function coord($model: TsuModel, $rule: CoordRule, $ctx: CoordCtx): ITsukiyoLocator {
  const loc = resolveLocator($rule, $ctx.w, $ctx.h, $ctx.dY)
  // dom 声明随 locator 携带、ctx.domX 是它在数值轴上的投影
  loc.ctx = { ...$ctx, domX: loc.dom?.x ?? $ctx.domX }

  const x = loc.x
  const y = loc.y
  const n = $model.count

  // 只产锚点 —— 对齐（center / baseBottom）是形状的声明、归 draw 执行
  // 本阶段零 aux / 零 w-h / 零 kind 判断：锚点即数据点在画布上的位置
  for (let _ξ = 0; _ξ < n; _ξ++) {
    const el = $model.elements[$model.src[_ξ]]
    if (!el) continue
    const iX = $model.dimX[_ξ]
    const iY = $model.dimY[_ξ]
    $model.x[_ξ] = x(el, loc.ctx, iX, iY)
    $model.y[_ξ] = y(el, loc.ctx, iX, iY)
  }

  return loc
}
