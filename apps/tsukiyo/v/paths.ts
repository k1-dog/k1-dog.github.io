/**
 * paths — 图形路径封闭器 + per-element 定型覆写（coord 之后接力）。
 *
 * 职责（写所有非位置几何）：
 *   - Rect（Bar）：h = 归一化目标高度（读 coordCtx ruler）
 *   - Arc（polar/饼图）：aux[1]/aux[2] = 扇形起止角度（用 sum 精确分配）
 *   - Line/Curve（折线/曲线图）：回写每个元素到下一个同类点的 Δx/Δy（w/h）
 *   - Triangle（雷达三角扇）：组装 V_{d+1} 偏移(w,h) + 圆心 C(aux0,aux1)
 *
 * 读取 coord 已写入 SoA 的顶点位置 x[]/y[] + coordCtx 的 ruler 结果，
 * 按原语类型写入对应的非位置几何（h/角度/Δ/偏移）。
 * 元素顺序（std.ts 行优先）：同系列 dimY 连续，系列边界 = dimX 变化
 *
 * 三角扇约定（与 shape/coord/render/model 对齐）：
 *   x,y   = V_d   （coord 投影写入，第一顶点）
 *   w,h   = V_{d+1} 相对 V_d 的偏移 （paths 组装写入，第二顶点）
 *   aux0,aux1 = C  相对 V_d 的偏移 （paths 组装写入，圆心第三顶点）
 * render 以 (x,y) / (x+w,y+h) / (x+aux0,y+aux1) 三点画三角形
 *
 * 内置规则从 coord 规则派生（radar→三角扇闭合，line→连接，bar→无）
 * 常驻 task，每帧由 scheduler tick 驱动（after coord）
 */
import type { CoordRule, CoordCtx } from '../yomi'
import { Prim } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_mapRange } from '../helper/maths'
import { ARC_START_ANGLE, GEO_SLOTS_EACH_ELEM, TAU } from '../helper/const'

/**
 * PathsHook — 自定义路径组装拦截器，与 pathsTask 同签名。
 * 用户通过 `.paths(hook)` 注入，engine 在 paths task 内优先调用 hook，
 * 否则回退到内置 pathsTask。引擎不感知任何具体图表类型。
 */
export type PathsHook = ($model: TsuModel, $rule: CoordRule, $ctx: CoordCtx) => void

/**
 * pathsTask — 写所有非位置几何，coord 之后接力。
 * 读 coord 写入的 x[]/y[] + coordCtx ruler，写 h[]/aux[]/w[]（尺寸/角度/偏移）+ dirty 标记。
 *
 * guard 由 engine 控制 — 只看 dataDirty（数据变化才重算目标几何）；
 * 用户 hook 无 guard（写绝对值，coord 每帧重写 x，hook 必须同步覆写）。
 * 动画缩放由 render 阶段统一应用，pathsTask 只写目标几何。
 */
export function pathsTask($model: TsuModel, $rule: CoordRule, $ctx: CoordCtx): void {
  const dimYCount = $model.dimYMap.size || 1

  // 多系列判定 — dimYCount>1 时 dimX 变化才是系列边界；
  // 基元数组（dimYCount=1）所有元素属同一条线，顺序连接，无系列边界
  const isMultiSeries = dimYCount > 1
  // 圆心 — 雷达三角扇的第三顶点 C（各系列共享同一圆心）
  const cx = $ctx.width / 2
  const cy = $ctx.height / 2

  // polar 累计角度 — 从 coordRule.init.θ 起始（默认 12 点钟方向）
  let _polarAng = $ctx.init?.θ ?? ARC_START_ANGLE

  // 跟踪当前 dimX 系列的起始索引（用于多系列闭合回绕）
  // 单系列不需要回绕，初始值 0 即可
  let _seriesStart = 0

  for (let _i = 0; _i < $model.count; _i++) {
    const primType = $model.type[_i]
    const dimX = $model.dimX[_i]
    const value = $model.value[_i]

    // —— 系列边界检测 ——
    // 多系列数据（radar）按 dimX 分组，dimX 变化 = 新系列开始
    // 单系列数据（bar/line 基元数组）dimYCount=1，无系列边界
    if (isMultiSeries && _i > 0 && dimX !== $model.dimX[_i - 1]) {
      _seriesStart = _i
    }

    // —— 系列末点判定 ——
    // 多系列：下一个元素 dimX 不同 → 当前是系列末点
    // 单系列：只有最后一个元素是末点
    const isSeriesEnd = isMultiSeries
      ? (_i + 1 >= $model.count || $model.dimX[_i + 1] !== dimX)
      : (_i + 1 >= $model.count)

    // —— per-element 定型覆写（读 ruler 写尺寸/角度）——

    if (primType === Prim.Rect) {
      // Rect：归一化幅值覆写 h 为目标高度（动画缩放由 render 统一应用）
      const normalized = Hm_mapRange(value, $ctx.valueMin, $ctx.valueMax, 0, $ctx.height)
      $model.h[_i] = Math.max(1, normalized)
      $model.markDirty(_i)
    } else if (primType === Prim.Arc && $rule.rule === 'polar') {
      // Arc + polar：用 sum 精确分配扇形角度（per-element，无需第二遍）
      const fraction = value / $ctx.valueSum
      const startAng = _polarAng
      _polarAng += fraction * TAU
      const a = _i * GEO_SLOTS_EACH_ELEM
      $model.aux[a + 1] = startAng
      $model.aux[a + 2] = _polarAng
      $model.markDirty(_i)
    }

    // —— 跨元素路径组装（读位置写 Δ/偏移）——

    if (primType === Prim.Line || primType === Prim.Curve) {
      // Line/Curve：回写当前元素到下一个点的 Δx/Δy
      // 末点在非 close 规则下 Δ=0 → render 跳过（不画最后一段）
      const nextIdx = isSeriesEnd ? _seriesStart : findNextSameType($model, _i, primType, dimX, isMultiSeries)

      let _dw = $model.x[nextIdx] - $model.x[_i]
      let _dh = $model.y[nextIdx] - $model.y[_i]

      // 系列末点 → 零长度，render 跳过（不画线段）
      if (isSeriesEnd) {
        _dw = 0
        _dh = 0
      }


      $model.w[_i] = _dw
      $model.h[_i] = _dh
      $model.markDirty(_i)
    } else if (primType === Prim.Triangle) {

      // Triangle（雷达三角扇）：组装 V_{d+1} 偏移(w,h) + 圆心 C 偏移(aux0,aux1)
      // V_{d+1} = 同系列下一维度顶点；系列末维度回绕到系列起点（闭合多边形）
      const nextIdx = isSeriesEnd ? _seriesStart : _i + 1

      // V_{d+1} 相对 V_d 的偏移
      let _dw = $model.x[nextIdx] - $model.x[_i]
      let _dh = $model.y[nextIdx] - $model.y[_i]
      // C 相对 V_d 的偏移
      let _dcx = cx - $model.x[_i]
      let _dcy = cy - $model.y[_i]

      // 目标偏移 — 动画缩放由 render 阶段统一应用
      $model.w[_i] = _dw
      $model.h[_i] = _dh

      const a = _i * GEO_SLOTS_EACH_ELEM
      $model.aux[a] = _dcx
      $model.aux[a + 1] = _dcy
      $model.markDirty(_i)
    }
  }
}

/**
 * 查找下一个同类型元素索引 — 跳过异类原语（如 Line 跳过 Curve）。
 * 当 point 返回多原语数组时（折线+曲线叠加），SoA 中异类元素交替排列，
 * 连接目标必须是同类型才能正确组装线段。
 *
 * 找不到下一个同类元素时返回 $start 自身（Δ=0，render 跳过末点），
 * 不回绕到起点 — 回绕会导致末点错误连接到首点产生横跨线。
 */
function findNextSameType(
  $model: TsuModel,
  $start: number,
  $prim: number,
  $dimX: number,
  $isMultiSeries: boolean,
): number {
  for (let _j = $start + 1; _j < $model.count; _j++) {
    // 系列边界 — 多系列模式下 dimX 变化即停止搜索
    if ($isMultiSeries && $model.dimX[_j] !== $dimX) break
    if ($model.type[_j] === $prim) return _j
  }
  // 找不到同类 → 返回自身，Δ=0，render 跳过
  return $start
}
