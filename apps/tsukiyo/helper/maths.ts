/**
 * maths — 数学计算 + RGBA 颜色计算
 *
 * 纯函数，零状态，可独立测试。
 * 统一颜色入口：Hm_pack / Hm_rgba / Hm_rgbaStr / Hm_alphaFill / Hm_palette。
 */
import { FILL_α } from './const'

import type { Bounds } from '../yomi'

// —— 基础数学 ——

/** 线性插值 — from → to 按 t 混合 */
export function Hm_lerp($from: number, $to: number, $t: number): number {
  return $from + ($to - $from) * $t
}

/** 钳制 — 限制 value 在 [min, max] 范围内 */
export function Hm_clamp($value: number, $min: number, $max: number): number {
  return $value < $min ? $min : $value > $max ? $max : $value
}

/** 映射 — 将 value 从 [inMin, inMax] 线性映射到 [outMin, outMax] */
export function Hm_mapRange(
  $value: number,
  $inMin: number,
  $inMax: number,
  $outMin: number,
  $outMax: number,
): number {
  const t = ($value - $inMin) / ($inMax - $inMin)
  return Hm_lerp($outMin, $outMax, Hm_clamp(t, 0, 1))
}

/** 缓动函数集合 */
export const Hm_Ease = {
  linear: ($t: number): number => $t,
  easeIn: ($t: number): number => $t * $t,
  easeOut: ($t: number): number => $t * (2 - $t),
  easeInOut: ($t: number): number => ($t < 0.5 ? 2 * $t * $t : -1 + (4 - 2 * $t) * $t),
  bounce: ($t: number): number => {
    if ($t < 1 / 2.75) return 7.5625 * $t * $t
    if ($t < 2 / 2.75) return 7.5625 * ($t -= 1.5 / 2.75) * $t + 0.75
    if ($t < 2.5 / 2.75) return 7.5625 * ($t -= 2.25 / 2.75) * $t + 0.9375
    return 7.5625 * ($t -= 2.625 / 2.75) * $t + 0.984375
  },
} as const

/** 两点距离 */
export function Hm_dist($x1: number, $y1: number, $x2: number, $y2: number): number {
  const dx = $x2 - $x1
  const dy = $y2 - $y1
  return Math.sqrt(dx * dx + dy * dy)
}

/** AABB 包含判定 — point 是否在 bounds 内 */
export function Hm_containsPoint($bounds: [number, number, number, number], $px: number, $py: number): boolean {
  return (
    $px >= $bounds[0] &&
    $px <= $bounds[2] &&
    $py >= $bounds[1] &&
    $py <= $bounds[3]
  )
}

/** 合并多个 Bounds 为单个包围盒（全局 min/max） */
export function Hm_unionBounds($rects: Bounds[]): Bounds | null {
  if ($rects.length === 0) return null
  let _minX = Infinity, _minY = Infinity, _maxX = -Infinity, _maxY = -Infinity
  for (const r of $rects) {
    _minX = Math.min(_minX, r[0][0])
    _minY = Math.min(_minY, r[0][1])
    _maxX = Math.max(_maxX, r[1][0])
    _maxY = Math.max(_maxY, r[1][1])
  }
  return [[_minX, _minY], [_maxX, _maxY]]
}


// —— RGBA 颜色计算 ——

/** packed RGBA → number（全系统唯一颜色打包函数） */
export function Hm_rgba($r: number, $g: number, $b: number, $a = 255): number {
  return (($a << 24) | ($r << 16) | ($g << 8) | $b) >>> 0
}

/** number → rgba string（Canvas2D 后端用） */
export function Hm_rgbaStr($packed: number): string {
  const a = ($packed >>> 24) & 0xff
  const r = ($packed >>> 16) & 0xff
  const g = ($packed >>> 8) & 0xff
  const b = $packed & 0xff
  return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`
}

/**
 * alpha 降级 — 保留 packed RGBA 的 RGB 通道，替换 alpha 为 FILL_α
 * 用于 Rect / Arc / Circle / Triangle 等所有原语的填充色统一降透明度
 */
export function Hm_alphaFill(
  $packed: number,
  $type: 'radar' | 'rect' | 'pie' = 'radar'
): number {
  return ((FILL_α[`${$type}_α`] << 24) | ($packed & 0x00ffffff)) >>> 0
}

// —— 调色板 ——

export const Hm_palette = {
  // shape.ts 默认填充色
  defaultFill: Hm_rgba(253, 206, 160, 255),

  // interact.ts hover 叠加高亮色（半透明橙）
  highlight: Hm_rgba(255, 165, 0, 180),

  // render.ts 锁定描边色（实心橙）
  stroke: Hm_rgba(255, 165, 0, 255),

  // v/index.ts 默认 pointFn 填充色（矢车菊蓝）
  primary: Hm_rgba(100, 149, 237, 200),

  // 多系列调色板 — 按系列索引取色
  series: [
    Hm_rgba(100, 149, 237, 200),  // blue
    Hm_rgba(255, 99, 71, 200),    // tomato red
    Hm_rgba(50, 205, 50, 200),    // lime green
    Hm_rgba(255, 165, 0, 200),    // orange
    Hm_rgba(148, 103, 189, 200),  // purple
  ],

  /** 按索引取系列色（循环） */
  seriesAt: ($i: number): number => Hm_palette.series[$i % Hm_palette.series.length]
}
