/**
 * m/scale — scale 阶段：尺度测绘；维度划分（dim 索引 + nx/ny/nr 展开）与值域统计
 * （v0/v1/vΣ + 数值轴 x0/x1）；产出 CoordCtx——coord 阶段只做纯投影
 */
import type { Element, CoordCtx } from '../yomi'
import type { TsuModel } from './model'
import { VALUE_MAX_EXPAND } from '../helper/const'

/** 尺度上下文 — scale 的唯一生产点 */
export interface ScaleResult {
  ctx: CoordCtx
  /** 两个轴声明的域字段（缺省 'value' / dimX） */
  domX?: string
  domY?: string
}

/**
 * scale — 维度划分 + 值域统计
 * 幂等：同一批元素在 resize 时重跑（相对声明必须跟随视口）
 */
export function scale(
  $model: TsuModel, $els: Element[], $w: number, $h: number,
  $domX?: string, $domY?: string, $y0 = true,
): CoordCtx {
  $model.elements = $els

  const dimXMap = $model.dimXMap
  const dimYMap = $model.dimYMap
  dimXMap.clear()
  dimYMap.clear()

  let _dX = 0
  let _dY = 0
  for (const el of $els) {
    const dx = String(el[el.dimX])
    if (!dimXMap.has(dx)) dimXMap.set(dx, _dX++)
    const dy = String(el.dimY)
    if (!dimYMap.has(dy)) dimYMap.set(dy, _dY++)
  }
  if (_dY > 255) console.warn('[tsukiyo] dimY series exceed 255 (Uint8Array dimY) — truncated')

  // 相对声明 — nx/ny ∈ [0,1] 视口比、nr 为 min(w,h)/2 的比例
  if ($w > 0 && $h > 0) {
    const halfMin = Math.min($w, $h) / 2
    for (const el of $els) {
      if (el.nx !== undefined) el.x = el.nx * $w
      if (el.ny !== undefined) el.y = el.ny * $h
      if (el.nr !== undefined) el.r = el.nr * halfMin
    }
  }

  // —— 值域统计（原 coord ① 步、纯扫描、与投影无关）——
  let _v0 = Infinity, _v1 = -Infinity, _vΣ = 0
  let _x0 = Infinity, _x1 = -Infinity
  const xKey = $domX
  for (const el of $els) {
    const v = el.value
    if (Number.isFinite(v)) {
      if (v < _v0) _v0 = v
      if (v > _v1) _v1 = v
      _vΣ += v
    }
    if (xKey !== undefined) {
      const xv = Number(el[xKey])
      if (Number.isFinite(xv)) {
        if (xv < _x0) _x0 = xv
        if (xv > _x1) _x1 = xv
      }
    }
  }
  if (_v0 === _v1) _v1 = _v0 + 1
  if (_vΣ <= 0) _vΣ = 1
  if (_x0 === _x1) _x1 = _x0 + 1

  // 零基线（默认）或真实区间
  if ($y0) {
    _v0 = 0
    _v1 *= VALUE_MAX_EXPAND
  }

  $model.reserve($els.length)
  return {
    w: $w, h: $h,
    dX: dimXMap.size || 1,
    dY: dimYMap.size || 1,
    v0: _v0, v1: _v1, vΣ: _vΣ,
    x0: xKey !== undefined ? _x0 : undefined,
    x1: xKey !== undefined ? _x1 : undefined,
  }
}
