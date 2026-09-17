/**
 * maths — 数学计算 + RGBA 颜色计算（纯函数零状态）
 */
import { FILL_α } from './const'

import type { Bounds } from '../yomi'

// —— 基础数学 ——

export function Hm_lerp($from: number, $to: number, $t: number): number {
  return $from + ($to - $from) * $t
}

export function Hm_clamp($value: number, $min: number, $max: number): number {
  return $value < $min ? $min : $value > $max ? $max : $value
}

/** [inMin,inMax] → [outMin,outMax] 线性映射（钳制） */
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

export function Hm_dist($x1: number, $y1: number, $x2: number, $y2: number): number {
  const dx = $x2 - $x1
  const dy = $y2 - $y1
  return Math.sqrt(dx * dx + dy * dy)
}

export function Hm_containsPoint($bounds: [number, number, number, number], $px: number, $py: number): boolean {
  return (
    $px >= $bounds[0] &&
    $px <= $bounds[2] &&
    $py >= $bounds[1] &&
    $py <= $bounds[3]
  )
}

/** 多 Bounds 合一（全局 min/max） */
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

/** packed RGBA（全系统唯一颜色打包） */
export function Hm_rgba($r: number, $g: number, $b: number, $a = 255): number {
  return (($a << 24) | ($r << 16) | ($g << 8) | $b) >>> 0
}

export function Hm_rgbaStr($packed: number): string {
  const a = ($packed >>> 24) & 0xff
  const r = ($packed >>> 16) & 0xff
  const g = ($packed >>> 8) & 0xff
  const b = $packed & 0xff
  return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`
}

/** alpha 替换为 FILL_α（RGB 保留 — 填充色统一降透明度） */
export function Hm_alphaFill(
  $packed: number,
  $type: 'radar' | 'rect' | 'pie' = 'radar'
): number {
  return ((FILL_α[`${$type}_α`] << 24) | ($packed & 0x00ffffff)) >>> 0
}

// —— 调色板 ——

export const Hm_palette = {
  defaultFill: Hm_rgba(253, 206, 160, 255),   // shape 默认填充
  highlight: Hm_rgba(255, 165, 0, 180),       // hover 高亮（半透明橙）
  stroke: Hm_rgba(255, 165, 0, 255),          // 锁定描边（实心橙）
  primary: Hm_rgba(100, 149, 237, 200),       // 默认 pointFn 填充（矢车菊蓝）
  series: [
    Hm_rgba(100, 149, 237, 200),  // blue
    Hm_rgba(255, 99, 71, 200),    // tomato red
    Hm_rgba(50, 205, 50, 200),    // lime green
    Hm_rgba(255, 165, 0, 200),    // orange
    Hm_rgba(148, 103, 189, 200),  // purple
  ],

  /** 按索引循环取系列色 */
  seriesAt: ($i: number): number => Hm_palette.series[$i % Hm_palette.series.length]
}
