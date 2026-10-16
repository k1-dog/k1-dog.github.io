/**
 * paths — 路径封闭器（coord 之后接力）：读 x[]/y[] + ruler，写所有非位置几何。
 * Rect→h 归一化幅值；Arc(polar)→aux[1]/[2] 扇形起止角（sum 精确分配）；
 * Triangle→三角扇组装；Line/Curve→跨图形 Δ(w,h) 连接（seal 回调驱动，零隐式系列推断）。
 * 三角扇约定（shape/coord/render/model 对齐）：x,y=V_d；w,h=V_{d+1} 偏移；aux0,aux1=圆心 C 偏移，
 * render 以 (x,y)/(x+w,y+h)/(x+aux0,y+aux1) 三点画三角形。常驻 task，tick 驱动（after coord）。
 */
import type { CoordCtx, SealConf, SealFn } from '../yomi'
import { Prim } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_mapRange } from '../helper/maths'
import { ARC_START_ANGLE, CURVE_NORMAL_RATIO, GEO_SLOTS_EACH_ELEM, TAU } from '../helper/const'

/** defaultSeal — 缺省 paths 回调：{Δi: i+1} 折线系列紧密连接（末点 Δ=0） */
export const defaultSeal: SealFn = ($el, $i) => ({ Δi: $i + 1 })

/**
 * bezier3ToCurve — the single source of cubic-bezier control points for a
 * Curve segment (P0=(x,y) -> P3=(x+w,y+h)). Shared by the render stroke
 * lane and the buildClosedPaths fill lane so both always stay in sync.
 *   - cp1+cp2 finite (user-specified): exact cubic bezier
 *   - either NaN (unspecified): the quadratic control point C (segment
 *     midpoint + normal * CURVE_NORMAL_RATIO) is EXACTLY lifted into cubic
 *     space — c1 = P0 + 2/3(C-P0), c2 = P3 + 2/3(C-P3). Mathematically
 *     identical curve (quadratic is a degenerate cubic), no branch needed
 *     at the call site.
 */
export function bezier3ToCurve(
  $x: number, $y: number, $w: number, $h: number,
  $cp1x: number, $cp1y: number, $cp2x: number, $cp2y: number,
): { c1x: number, c1y: number, c2x: number, c2y: number } {
  if (Number.isFinite($cp1x) && Number.isFinite($cp1y) &&
      Number.isFinite($cp2x) && Number.isFinite($cp2y)) {
    return { c1x: $cp1x, c1y: $cp1y, c2x: $cp2x, c2y: $cp2y }
  }
  // exact quadratic -> cubic lift (no approximation)
  const cx = $x + $w / 2 - $h * CURVE_NORMAL_RATIO   // legacy quadratic C
  const cy = $y + $h / 2 + $w * CURVE_NORMAL_RATIO
  const ex = $x + $w, ey = $y + $h
  return {
    c1x: $x + (cx - $x) * 2 / 3, c1y: $y + (cy - $y) * 2 / 3,
    c2x: ex + (cx - ex) * 2 / 3, c2y: ey + (cy - ey) * 2 / 3,
  }
}

/**
 * sealAnchor — materialize a chain anchor point from the seal config
 * (coordinate-system agnostic, the single anchor dispatch point):
 *   - polar declaration (Δr / Δangle° set): anchor = (ax + Δr·cos(θ+Δa°),
 *     ay + Δr·sin(θ+Δa°)) — θ from the target element's polar semantics
 *     (arc aux start angle); degenerate cartesian otherwise
 *   - cartesian declaration (ΔfromP/ΔtoP or default [0,0]): anchor = (ax, ay) + offset
 */
function sealAnchor($ax: number, $ay: number, $polar: { r?: number, a?: number } | null, $offset: [number, number]): [number, number] {
  if ($polar && ($polar.r !== undefined || $polar.a !== undefined)) {
    const r = $polar.r ?? 0
    const a = ($polar.a ?? 0) * Math.PI / 180
    return [$ax + r * Math.cos(a), $ay + r * Math.sin(a)]
  }
  return [$ax + $offset[0], $ay + $offset[1]]
}

/**
 * buildClosedPaths — anchor-chain assembler driven by the seal Δ links
 * (type-agnostic chain assembly, single geometry dispatch per hop):
 *   1. chain-head first: query every slot's seal Δ once, collect the
 *      pointed-to set; walk chains from TRUE heads (pointed to by nobody)
 *      — chain ownership no longer depends on slot order
 *   2. second pass: remaining pure closed loops (no external head)
 *   3. per-hop geometry by the slot's own primitive: Line → lineTo,
 *      Curve → bezierCurveTo (exact cubic / lifted quadratic), any other
 *      prim → straight anchor lineTo (connection-line semantics, e.g.
 *      sector-to-sector link lines)
 *   closePath at every chain tail (closed loop or open tail alike).
 * Called at the tail of the paths stage; consumers get the finished
 * closed paths via engine.closedPaths / engine.setFill.
 */
export function buildClosedPaths($model: TsuModel, $seal: SealFn, $ctx: CoordCtx): Path2D[] {
  const paths: Path2D[] = []
  const visited = new Set<number>()

  // one seal query per slot (map), for head detection and chain walking;
  // noLoop slots (Δloop:false) are excluded from the fill-lane chain walk
  // entirely — their stroke geometry (w/h) is still assembled by pathsTask
  const confs: (SealConf | null)[] = new Array($model.count).fill(null)
  const hop: Int32Array = new Int32Array($model.count).fill(-1)
  const pointedTo = new Set<number>()
  const noLoop = new Set<number>()
  for (let i = 0; i < $model.count; i++) {
    const el = $model.elements[$model.src[i]]
    if (!el) continue
    const conf = $seal(el, i, $model, $ctx)
    confs[i] = conf
    if (conf) {
      const ti = conf.Δi
      const valid = ti >= 0 && ti < $model.count && ti !== i
        && ($model.type[ti] === Prim.Line || $model.type[ti] === Prim.Curve
          || $model.type[ti] === Prim.Arc || $model.type[ti] === Prim.Rect
          || $model.type[ti] === Prim.Circle || $model.type[ti] === Prim.Triangle)
      hop[i] = valid ? ti : -1
      if (valid) pointedTo.add(ti)
      if (conf.Δloop === false) {
        noLoop.add(i)
        pointedTo.delete(ti)
      }
    }
  }

  // hop geometry + anchor materialization (single dispatch point per hop)
  const emitHop = ($path: Path2D, $i: number, $isHead: boolean): number => {
    const x = $model.x[$i], y = $model.y[$i]
    const w = $model.w[$i], h = $model.h[$i]
    const t = $model.type[$i]
    if ($isHead) $path.moveTo(x, y)
    if (t === Prim.Curve) {
      const a = $i * GEO_SLOTS_EACH_ELEM
      const { c1x, c1y, c2x, c2y } = bezier3ToCurve(
        x, y, w, h,
        $model.aux[a], $model.aux[a + 1], $model.aux[a + 2], $model.aux[a + 3],
      )
      $path.bezierCurveTo(c1x, c1y, c2x, c2y, x + w, y + h)
    } else if (t === Prim.Line) {
      $path.lineTo(x + w, y + h)
    } else {
      // non-line/curve prims in a chain — connection-line semantics:
      // anchor line straight through the anchor point (polar-aware)
      const conf = confs[$i]
      const polar = conf && (conf.Δr !== undefined || conf['Δangle°'] !== undefined)
        ? { r: conf.Δr, a: conf['Δangle°'] } : null
      const off = conf?.ΔfromP ?? [0, 0]
      const [ax, ay] = sealAnchor(x, y, polar, off as [number, number])
      $path.lineTo(ax, ay)
    }
    return hop[$i]
  }

  const walk = (head: number) => {
    if (visited.has(head)) return
    if ($model.type[head] === Prim.Text) return   // text never chains
    // stroke-only segments (Δloop:false) never join the fill lane
    if (noLoop.has(head)) return
    // isolated segments never join a chain: hop out AND never pointed to
    if (hop[head] < 0 && !pointedTo.has(head)) return
    const path = new Path2D()
    let cur = head
    let next = -1
    while (true) {
      visited.add(cur)
      next = emitHop(path, cur, cur === head)
      // stop before entering a stroke-only segment (or a visited one)
      if (next < 0 || visited.has(next) || noLoop.has(next)) break
      cur = next
    }
    path.closePath()
    paths.push(path)
  }

  // pass 1 — true chain heads (pointed to by nobody) first
  for (let i = 0; i < $model.count; i++) {
    if (!pointedTo.has(i) && !noLoop.has(i)) walk(i)
  }
  // pass 2 — remaining pure closed loops
  for (let i = 0; i < $model.count; i++) {
    walk(i)
  }

  return paths
}

// pathsTask — 只写目标几何（动画缩放归 render；guard 归 engine）；ctx 从 rule.ctx 取（单点生产）
// Line/Curve 的跨图形 Δ 连接由 seal 回调返回值驱动（唯一事实源，零隐式系列推断）：
//   SealConf → w/h = (目标点+ΔtoP) − (源点+ΔfromP)；null/undefined → 断开 Δ=0；
//   Δi 越界 / 目标非 Line/Curve → 守卫为断开（不自连不出界）
export function pathsTask($model: TsuModel, $rule: ITsukiyoLocator, $seal: SealFn = defaultSeal): void {
  const $ctx = $rule.ctx
  if (!$ctx) return
  const dimYCount = $model.dimYMap.size || 1

  // dimYCount>1 → dimX 变化即系列边界（Triangle 顶点链闭合消费）；=1 单链
  const isMultiSeries = dimYCount > 1
  const cx = $ctx.width / 2          // 圆心（三角扇第三顶点 C）
  const cy = $ctx.height / 2

  let _polarAng = $rule.init?.θ ?? ARC_START_ANGLE   // polar 累计角（默认 12 点钟）
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
    } else if (primType === Prim.Arc) {
      // 角度占位检测（NaN 哨兵 — point 阶段写入）→ 按 value 比例分配；显式角度保持不动
      const a = _i * GEO_SLOTS_EACH_ELEM
      if (Number.isNaN($model.aux[a + 1])) {
        const fraction = value / $ctx.valueSum
        const startAng = _polarAng
        _polarAng += fraction * TAU
        $model.aux[a + 1] = startAng
        $model.aux[a + 2] = _polarAng
        $model.markDirty(_i)
      }
    }

    // —— 跨元素路径组装 ——

    if (primType === Prim.Line || primType === Prim.Curve) {
      // seal 回调逐元素问询 — 连接语义唯一事实源
      // 链关系（Δi 跳转）对全类型开放（buildClosedPaths 消费）；
      // w/h Δ 覆写仅 Line/Curve（w/h 对这两类 = Δ 语义，其他类型 w/h 是自几何不覆写）
      const el = $model.elements[$model.src[_i]]
      const conf: SealConf | null = el ? $seal(el, _i, $model, $ctx) : null
      const ti = conf ? conf.Δi : -1
      // guard: out of range / self -> break the link
      const valid = ti >= 0 && ti < $model.count && ti !== _i
      if (valid) {
        // anchor materialization — coordinate-system agnostic (single point):
        // polar declaration (Δr/Δangle°) or cartesian (ΔfromP/ΔtoP)
        const tel = $model.elements[$model.src[ti]]
        const polar = conf!.Δr !== undefined || conf!['Δangle°'] !== undefined
        let tax = $model.x[ti]
        let tay = $model.y[ti]
        if (polar && tel) {
          // polar anchor rides the target's own polar semantics (arc aux angle)
          const a = ti * GEO_SLOTS_EACH_ELEM
          const θ = $model.aux[a + 1]
          const r = conf!.Δr ?? 0
          const d = (conf!['Δangle°'] ?? 0) * Math.PI / 180
          tax += r * Math.cos(θ + d)
          tay += r * Math.sin(θ + d)
        } else {
          const tx = conf!.ΔtoP ?? [0, 0]
          tax += tx[0]
          tay += tx[1]
        }
        const fx = conf!.ΔfromP ?? [0, 0]
        $model.w[_i] = tax - ($model.x[_i] + fx[0])
        $model.h[_i] = tay - ($model.y[_i] + fx[1])
      } else {
        $model.w[_i] = 0
        $model.h[_i] = 0
      }
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
