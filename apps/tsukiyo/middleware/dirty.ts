/**
 * TsuDirty — 脏域：δ 槽位位图 + Α 区域集
 * Λ 折叠 Α ∪ ΑΔ → 本帧重绘域（上帧域并入：旧位 / 旧像素 / 旧填充由单机制清除）
 */
import type { Aabb } from '../yomi'

export class TsuDirty {
  /** δ — 槽位位图：ξ ∈ δ 即本帧脏 */
  private δ = new Uint8Array(0)
  /** Α — 本帧区域集；ΑΔ — 上帧区域集（Δ = 上一代） */
  private Α: Aabb[] = []
  private ΑΔ: Aabb[] = []
  /** full — 全域脏（换代 / 视线移动）：Λ 返回 null、调用方按整屏处理 */
  private full = false
  private buf: number[] = []

  /** ξ ∈ δ（幂等置位） */
  mark($ξ: number): void {
    if ($ξ < 0) return
    if ($ξ >= this.δ.length) {
      const Δ = new Uint8Array(Math.max($ξ + 1, this.δ.length * 2, 64))
      Δ.set(this.δ)
      this.δ = Δ
    }
    this.δ[$ξ] = 1
  }

  /** 0..n-1 ∈ δ（元素集整体换代） */
  markAll($n: number): void {
    if ($n <= 0) return
    if ($n > this.δ.length) {
      const Δ = new Uint8Array(Math.max($n, this.δ.length * 2, 64))
      Δ.set(this.δ)
      this.δ = Δ
    }
    this.δ.fill(1, 0, $n)
  }

  /** a ∈ Α */
  markArea($a: Aabb): void {
    this.Α.push([[$a[0][0], $a[0][1]], [$a[1][0], $a[1][1]]])
  }

  /** full ← true */
  markFull(): void {
    this.full = true
  }

  /** full 标志探视 — 下次 Λ 折叠是否整屏重绘 */
  get isFull(): boolean {
    return this.full
  }

  /** 扫 δ 取 ξ 集合并清空（复用缓冲） */
  drain(): number[] {
    const out = this.buf
    out.length = 0
    const δ = this.δ
    for (let _ξ = 0; _ξ < δ.length; _ξ++) {
      if (δ[_ξ]) {
        out.push(_ξ)
        δ[_ξ] = 0
      }
    }
    return out
  }

  /** Λ(Α ∪ ΑΔ) → 合并域；ΑΔ ← Α 轮转full ⇒ null（整屏） */
  Λ(): Aabb | null {
    const wasFull = this.full
    this.full = false

    let _x0 = Infinity, _y0 = Infinity, _x1 = -Infinity, _y1 = -Infinity
    for (const pool of [this.Α, this.ΑΔ]) {
      for (const a of pool) {
        if (a[0][0] < _x0) _x0 = a[0][0]
        if (a[0][1] < _y0) _y0 = a[0][1]
        if (a[1][0] > _x1) _x1 = a[1][0]
        if (a[1][1] > _y1) _y1 = a[1][1]
      }
    }

    const Δ = this.ΑΔ
    this.ΑΔ = this.Α
    this.Α = Δ
    this.Α.length = 0

    if (wasFull || _x0 > _x1) return null
    return [[_x0, _y0], [_x1, _y1]]
  }
}
