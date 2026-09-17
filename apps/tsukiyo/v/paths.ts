/**
 * paths — 路径封闭器（coord 之后接力）：读 x[]/y[] + ruler，写所有非位置几何。
 * Rect→h 归一化幅值；Arc(polar)→aux[1]/[2] 扇形起止角（sum 精确分配）；
 * Line/Curve→到下一同类点 Δ(w,h)；Triangle→三角扇组装。
 * 三角扇约定（shape/coord/render/model 对齐）：x,y=V_d；w,h=V_{d+1} 偏移；aux0,aux1=圆心 C 偏移，
 * render 以 (x,y)/(x+w,y+h)/(x+aux0,y+aux1) 三点画三角形。常驻 task，tick 驱动（after coord）。
 */
import type { CoordRule, CoordCtx } from '../yomi'
import { Prim } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_mapRange } from '../helper/maths'
import { ARC_START_ANGLE, GEO_SLOTS_EACH_ELEM, TAU } from '../helper/const'

// PathsHook — 自定义路径拦截器（`.paths(hook)` 注入，优先于内置）
export type PathsHook = ($model: TsuModel, $rule: CoordRule, $ctx: CoordCtx) => void

// pathsTask — 只写目标几何（动画缩放归 render；guard 归 engine）
export function pathsTask($model: TsuModel, $rule: CoordRule, $ctx: CoordCtx): void {
  const dimYCount = $model.dimYMap.size || 1

  // dimYCount>1 → dimX 变化即系列边界；=1 单线顺序连接
  const isMultiSeries = dimYCount > 1
  const cx = $ctx.width / 2          // 圆心（三角扇第三顶点 C）
  const cy = $ctx.height / 2

  let _polarAng = $ctx.init?.θ ?? ARC_START_ANGLE   // polar 累计角（默认 12 点钟）
  let _seriesStart = 0               // 系列起始索引（闭合回绕）

  for (let _i = 0; _i < $model.count; _i++) {
    const primType = $model.type[_i]
    const dimX = $model.dimX[_i]
    const value = $model.value[_i]

    // 系列边界：dimX 变化 = 新系列
    if (isMultiSeries && _i > 0 && dimX !== $model.dimX[_i - 1]) {
      _seriesStart = _i
    }

    // 系列末点
    const isSeriesEnd = isMultiSeries
      ? (_i + 1 >= $model.count || $model.dimX[_i + 1] !== dimX)
      : (_i + 1 >= $model.count)

    // —— per-element 定型覆写 ——

    if (primType === Prim.Rect) {
      // h = 归一化幅值
      const normalized = Hm_mapRange(value, $ctx.valueMin, $ctx.valueMax, 0, $ctx.height)
      $model.h[_i] = Math.max(1, normalized)
      $model.markDirty(_i)
    } else if (primType === Prim.Arc && $rule.rule === 'polar') {
      // 扇形角度 = value/sum × TAU
      const fraction = value / $ctx.valueSum
      const startAng = _polarAng
      _polarAng += fraction * TAU
      const a = _i * GEO_SLOTS_EACH_ELEM
      $model.aux[a + 1] = startAng
      $model.aux[a + 2] = _polarAng
      $model.markDirty(_i)
    }

    // —— 跨元素路径组装 ——

    if (primType === Prim.Line || primType === Prim.Curve) {
      // Δ = 到下一同类点偏移；末点 Δ=0
      const nextIdx = isSeriesEnd ? _seriesStart : findNextSameType($model, _i, primType, dimX, isMultiSeries)

      let _dw = $model.x[nextIdx] - $model.x[_i]
      let _dh = $model.y[nextIdx] - $model.y[_i]

      if (isSeriesEnd) {
        _dw = 0
        _dh = 0
      }


      $model.w[_i] = _dw
      $model.h[_i] = _dh
      $model.markDirty(_i)
    } else if (primType === Prim.Triangle) {
      // V_{d+1} = 同系列下一维度；末维度回绕闭合
      const nextIdx = isSeriesEnd ? _seriesStart : _i + 1

      let _dw = $model.x[nextIdx] - $model.x[_i]   // V_{d+1} 相对 V_d 偏移
      let _dh = $model.y[nextIdx] - $model.y[_i]
      let _dcx = cx - $model.x[_i]                 // C 相对 V_d 偏移
      let _dcy = cy - $model.y[_i]

      $model.w[_i] = _dw
      $model.h[_i] = _dh

      const a = _i * GEO_SLOTS_EACH_ELEM
      $model.aux[a] = _dcx
      $model.aux[a + 1] = _dcy
      $model.markDirty(_i)
    }
  }
}

// 下一同类型元素索引（找不到返回自身 → Δ=0，不回绕避免横跨线）
function findNextSameType(
  $model: TsuModel,
  $start: number,
  $prim: number,
  $dimX: number,
  $isMultiSeries: boolean,
): number {
  for (let _j = $start + 1; _j < $model.count; _j++) {
    if ($isMultiSeries && $model.dimX[_j] !== $dimX) break   // 系列边界停止搜索
    if ($model.type[_j] === $prim) return _j
  }
  return $start
}
