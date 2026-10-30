/**
 * maths — 纯数值 + RGBA 颜色工具（零状态）
 */
import { FILL_α } from './const'

/** 按比例混合两个数（$t ∈ [0,1]） */
export function Hm_mix($from: number, $to: number, $t: number): number {
  return $from + ($to - $from) * $t
}

/** 限制数值在 [min, max] 内 */
export function Hm_fit($v: number, $min: number, $max: number): number {
  return $v < $min ? $min : $v > $max ? $max : $v
}

/** 区间映射（结果被 clamp） */
export function Hm_map($v: number, $inMin: number, $inMax: number, $outMin: number, $outMax: number): number {
  return Hm_mix($outMin, $outMax, Hm_fit(($v - $inMin) / ($inMax - $inMin), 0, 1))
}

/** 打包 RGBA — 唯一的颜色打包点 */
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

/** 换 alpha 为领域填充透明度（RGB 保留） */
export function Hm_alphaFill($packed: number, $domain: keyof typeof FILL_α = 'radar'): number {
  return ((FILL_α[$domain] << 24) | ($packed & 0x00ffffff)) >>> 0
}

/** 颜色族 — fill / stroke / series(i)（series(0) 即默认填充色） */
export const Hm_color = {
  fill: Hm_rgba(100, 149, 237, 200),
  stroke: Hm_rgba(255, 165, 0, 255),
  series: [
    Hm_rgba(100, 149, 237, 200),
    Hm_rgba(255, 99, 71, 200),
    Hm_rgba(50, 205, 50, 200),
    Hm_rgba(255, 165, 0, 200),
    Hm_rgba(148, 103, 189, 200),
  ] as number[],
  seriesAt: ($i: number): number => Hm_color.series[$i % Hm_color.series.length],
}
