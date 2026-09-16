/**
 * dirty — 脏矩形收集/合并/清除（单一职责）。
 *
 * 参考 SC2：每帧只重绘脏区域而非全屏。
 * 多个脏矩形重叠时合并，减少重绘面积。
 *
 * 不做裁剪、不做渲染、不做缓存——只管收集与合并。
 */
import type { Bounds } from '../yomi'

// AABB 重叠判定
function overlap($a: Bounds, $b: Bounds): boolean {
  return (
    $a[0][0] <= $b[1][0] &&
    $b[0][0] <= $a[1][0] &&
    $a[0][1] <= $b[1][1] &&
    $b[0][1] <= $a[1][1]
  )
}

// 合并两个 AABB
function merge2($a: Bounds, $b: Bounds): Bounds {
  return [
    [Math.min($a[0][0], $b[0][0]), Math.min($a[0][1], $b[0][1])],
    [Math.max($a[1][0], $b[1][0]), Math.max($a[1][1], $b[1][1])],
  ]
}

export class Dirty {
  private rects: Bounds[] = []

  /** 标记脏区域 */
  mark($b: Bounds): void {
    this.rects.push($b)
  }

  /** 合并重叠的脏矩形，返回最小不相交集合 */
  merge(): Bounds[] {
    if (this.rects.length <= 1) return [...this.rects]

    // 按 minX 排序后线性扫描合并
    const sorted = [...this.rects].sort(($a, $b) => $a[0][0] - $b[0][0])
    const out: Bounds[] = [sorted[0]]

    for (let _i = 1; _i < sorted.length; _i++) {
      const last = out[out.length - 1]
      if (overlap(last, sorted[_i])) {
        out[out.length - 1] = merge2(last, sorted[_i])
      } else {
        out.push(sorted[_i])
      }
    }
    return out
  }

  /** 原子操作：取合并结果并清空 */
  consume(): Bounds[] {
    const r = this.merge()
    this.clear()
    return r
  }

  /** 清空所有脏区域 */
  clear(): void {
    this.rects.length = 0
  }

  get empty(): boolean {
    return this.rects.length === 0
  }
}
