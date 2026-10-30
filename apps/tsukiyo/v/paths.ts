/**
 * v/paths — paths 阶段：非位置几何 + 跨图形封闭；全部由 spec 声明驱动（零形状分支）：
 * ① grow 求尺寸（spec.grow 把值映射进局部盒）② Pen 重建路径（spec.geo 产出主路径 + 包围盒 + 子图形）
 * ③ 链路封闭（RoadRule 声明或 RoadFn 回调）锚点归 coord、包围盒读取归 spatial
 */
import type { RoadConf, RoadFn, RoadRule, FillRoad, ITsukiyoLocator, Aabb, ShapeSpec, CoordCtx } from '../yomi'
import type { TsuModel } from '../m/model'
import { Hm_map } from '../helper/maths'
import { Pen } from './pen'
import { specOf } from './shape'
import { ARC_START_ANGLE, DEFAULT_GROUP_KEY, TAU } from '../helper/const'

/**
 * 槽内层号 — 同一元素产出的多个槽（ShapeFn 返回数组）的第几层
 * 双轨折线就是「一个元素、两层」：层 0 与层 1 必须各自成链
 */
function laneOf($i: number, $m: TsuModel): number {
  let _l = 0
  while (_l < $i && $m.src[$i - _l - 1] === $m.src[$i]) _l++
  return _l
}

/**
 * 系列分组轴 σ — 扫描时「保持不变」的那个维度、由形状语义决定：
 * - line / curve：一条折线 = 一个度量 → σ = dimY（dimX 是它在类别上的走向）
 * - 其余（rect / arc / triangle / circle）：一行数据为一系列 → σ = dimX
 *   （雷达一行 5 个三角、饼/玫瑰一个元素一个扇区）
 */
function σOf($i: number, $m: TsuModel): unknown {
  const k = specOf($m.id[$i])?.kind
  return (k === 'line' || k === 'curve') ? $m.dimY[$i] : $m.dimX[$i]
}

/**
 * 系列键 — ⟨σ, id, lane⟩
 * - σ = 分组轴（见 σOf）：折线沿度量、其余沿分类；
 * - id = 形状层（Line 与 Curve 不是同一条链）；
 * - lane = 同元素的第几层（双轨折线：同系列、同形状、不同层）
 */
function seriesSame($a: number, $b: number, $m: TsuModel): boolean {
  return σOf($a, $m) === σOf($b, $m)
    && $m.id[$a] === $m.id[$b]
    && laneOf($a, $m) === laneOf($b, $m)
}

/** 缺省链路 — 无系列信息时的相邻链（paths 会替换为 seriesRoad） */
export const defaultRoad: RoadFn = ($_el, $i) => ({ Δi: $i + 1 })

/**
 * 默认链路 — 沿系列前进、**末槽断开**（不回绕）
 * 回绕是 `{ loop: true }` 的语义、不属于默认链路
 */
function seriesRoad($next: Int32Array): RoadFn {
  return ($_el, $i) => ({ Δi: $next[$i] })
}

/**
 * 声明式链路 → RoadFn
 * 四字段封顶（loop / step / by / fill）、复杂拓扑请直接写 RoadFn
 */
export function ruleToFn($rule: RoadRule): RoadFn {
  const loop = $rule.loop === true
  const step = $rule.step ?? 1
  return ($el, $i, $m) => {
    let _ti: number
    if ($rule.by !== undefined) {
      // 同组跳转 — 同 by 键的下一个槽；找不到时按 loop 回绕到同组首个
      const n = nextOf($el[$rule.by], $i, $m)
      _ti = n >= 0 ? n : (loop ? firstOf($el[$rule.by], $m) : -1)
    } else if (loop) {
      // 回绕 — 同系列末点接回首点（跨越 n 是合法回绕、不是断裂）
      _ti = nextInSeries($i, $m)
    } else {
      _ti = $i + step
    }
    const conf: RoadConf = { Δi: _ti }
    if (loop) conf.Δloop = true
    if ($rule.fill !== undefined) conf.fill = $rule.fill
    return conf
  }
}

/**
 * 同系列下一槽 — 系列 = 同 ⟨dimY, id, lane⟩ 的连续段（一条折线 = 一条系列）
 * 末槽回绕到本系列的头、于是 { loop: true } 才真正闭合成环
 */
function nextInSeries($i: number, $m: TsuModel): number {
  // 跨过本元素其余层、找下一个元素的同 lane 同形状
  const src = $m.src[$i]
  let _j = $i + 1
  while (_j < $m.count && $m.src[_j] === src) _j++
  if (_j < $m.count && seriesSame(_j, $i, $m)) return _j
  // 末槽 → 回绕到本系列头（同 lane 同形状的最早一个 src）
  let _head = $i
  while (_head > 0) {
    const ps = $m.src[_head - 1]
    let _k = _head - 1
    while (_k > 0 && $m.src[_k - 1] === ps) _k--
    if (!seriesSame(_k, $i, $m)) break
    _head = _k
  }
  return _head
}

/** 同组首个槽 */
function firstOf($key: unknown, $m: TsuModel): number {
  for (let _j = 0; _j < $m.count; _j++) {
    const el = $m.elements[$m.src[_j]]
    if (el && el[DEFAULT_GROUP_KEY] === $key) return _j
  }
  return -1
}

/** 同组下一个槽 — 一次反向扫描（不建索引表：组内连续、向后找即得） */
function nextOf($key: unknown, $i: number, $m: TsuModel): number {
  const n = $m.count
  for (let _j = $i + 1; _j < n; _j++) {
    const el = $m.elements[$m.src[_j]]
    if (el && el[DEFAULT_GROUP_KEY] === $key) return _j
  }
  return -1
}

/**
 * 归一化 RoadRule | RoadFn → RoadFn
 * 传入 `$ring` 时、未声明 road 走系列链（多槽元素不串层）
 */
export function resolveRoad($rule: RoadFn | RoadRule | undefined, $ring?: Int32Array): RoadFn {
  if (!$rule) return $ring ? seriesRoad($ring) : defaultRoad
  if (typeof $rule === 'function') return $rule
  return ruleToFn($rule)
}

/**
 * seriesNext — 「同系列下一个槽」映射、一趟建好系列 = ⟨dimY, id, lane⟩ 的极大连续段；
 * 末槽为 -1（断开）默认链路的唯一来源：跨层 / 跨系列永不直连
 * 回绕版见 nextInSeries（供 { loop: true }）——两条语义分开、否则默认折线被意外闭合
 */
function seriesNext($m: TsuModel): Int32Array {
  const n = $m.count
  const next = new Int32Array(n).fill(-1)
  // 同元素的多个槽是「不同 lane」、不能互为邻居
  // 因此：跳过本元素、然后在**后续每个元素的全部槽**里找同 ⟨σ,id,lane⟩ 的那一槽
  // （双轨折线的 curve 层是该元素的第 2 槽、只看首槽会永远匹配不上）
  for (let _ξ = 0; _ξ < n; _ξ++) {
    const src = $m.src[_ξ]
    let _j = _ξ + 1
    while (_j < n && $m.src[_j] === src) _j++      // 跳过本元素其余层
    while (_j < n) {
      const s = $m.src[_j]
      let _hit = -1
      while (_j < n && $m.src[_j] === s) {          // 扫这个元素的每个槽
        if (seriesSame(_j, _ξ, $m)) { _hit = _j; break }
        _j++
      }
      if (_hit >= 0) { next[_ξ] = _hit; break }
      while (_j < n && $m.src[_j] === s) _j++       // 剩下的同 src 槽也跳过
    }
  }
  return next
}

/**
 * seriesRing — 回绕版本：末槽接回本系列头（仅 `{ loop: true }` 使用）
 */
function seriesRing($m: TsuModel): Int32Array {
  return nextOfSeriesMap($m, true)
}

/** 系列后继映射 — `$wrap` 为真时末槽回绕到本系列头（供 `{ loop: true }`） */
function nextOfSeriesMap($m: TsuModel, $wrap: boolean): Int32Array {
  const n = $m.count
  const next = seriesNext($m)
  if (!$wrap) return next
  for (let _ξ = 0; _ξ < n; _ξ++) {
    if (next[_ξ] >= 0) continue
    // 末槽 → 找本系列最早一个槽（跨 src 回溯同 lane 同形状）
    let _head = _ξ
    for (let _k = 0; _k < _ξ; _k++) {
      if (seriesSame(_k, _ξ, $m)) { _head = _k; break }
    }
    next[_ξ] = _head
  }
  return next
}

/** 局部盒复用缓冲 */
const BOX: Record<string, number> = {}

/**
 * paths 阶段 — 求尺寸、重建路径、组装封闭链路
 * 产物：FillRoad（无声明 fill 时为 null）+ 写入 model 的 paths / subs / bounds
 */
export function paths($model: TsuModel, $loc: ITsukiyoLocator, $roadFn: RoadFn | RoadRule): FillRoad | null {
  const ctx = $loc.ctx
  if (!ctx) return null
  // 注意：本阶段产物是 FillRoad、故 spawn 前 locator 已由 coord 交棒；
  // layering 通过 dirty/space 读几何、不依赖 FillRoad

  const n = $model.count
  // 默认链路用「不回绕」的 seriesNext；只有显式 road（含 { loop: true }）才走回绕表
  // 未声明 road（undefined / null / defaultRoad）都属默认链路——早期只在 === defaultRoad
  // 时取 next、undefined 落到 resolveRoad(ring) 分支、默认折线末槽被闭合成环（断裂并交叉）
  const next = seriesNext($model)
  const ring = seriesRing($model)
  const isDefault = !$roadFn || $roadFn === defaultRoad
  const road = isDefault ? seriesRoad(next) : resolveRoad($roadFn, ring)
  const pen = new Pen()

  // —— ① 值几何先算：grow 写 aux（r / startAng / endAng）、
  //    后续 RoadFn 才能读到真实极坐标几何（玫瑰桥接依赖它）——
  let _θ = $loc.init?.θ ?? ARC_START_ANGLE
  for (let _ξ = 0; _ξ < n; _ξ++) {
    const spec = specOf($model.id[_ξ])
    if (!spec) continue
    // 链形状的尺寸来自 Δ（见 ③）、此处只算值形状
    if (spec.kind === 'line' || spec.kind === 'curve') continue

    packBox($model, _ξ, spec)
    valueBox($model, _ξ, spec, ctx, ring, BOX)

    // 弧的角度带按值比切分（累积角 _θ 单调推进）
    // 必须排在 valueBox 之后：grow 可能改写 r、但角度带归 paths 独占
    if (spec.kind === 'arc' && !Number.isFinite(BOX.startAng)) {
      const a = _ξ * 5
      const from = _θ
      _θ += ($model.value[_ξ] / ctx.vΣ) * TAU
      BOX.startAng = from
      BOX.endAng = _θ
      $model.aux[a + 1] = from
      $model.aux[a + 2] = _θ
    }

    $model.w[_ξ] = BOX.w
    $model.h[_ξ] = BOX.h
  }

  // —— ② road 解析 —— aux 已就绪、RoadFn 可读极坐标几何 ——
  const confs: (RoadConf | null)[] = new Array(n).fill(null)
  let _fill = NaN
  for (let _ξ = 0; _ξ < n; _ξ++) {
    const el = $model.elements[$model.src[_ξ]]
    if (!el) continue
    const conf = road(el, _ξ, $model, ctx)
    confs[_ξ] = conf
    if (conf && Number.isNaN(_fill) && conf.fill !== undefined) _fill = conf.fill
  }

  // —— ③ 链几何：w/h = 目标锚点 − (本槽锚点 + ΔfromP)（line / curve 专用）——
  //    两趟：w/h 全部按**原始锚点**算完、再统一做 ΔfromP 锚点修正 ——
  //    链段起点 = 本槽锚点 + ΔfromP 是 road 的声明语义（coord 只投影原始数据点、
  //    链几何物化归 paths）、先修正会让后算的槽读到别的槽的修正值
  for (let _ξ = 0; _ξ < n; _ξ++) {
    const spec = specOf($model.id[_ξ])
    if (!spec || (spec.kind !== 'line' && spec.kind !== 'curve')) continue
    packBox($model, _ξ, spec)
    linkBox($model, _ξ, confs[_ξ], BOX)
    $model.w[_ξ] = BOX.w
    $model.h[_ξ] = BOX.h
  }
  for (let _ξ = 0; _ξ < n; _ξ++) {
    const conf = confs[_ξ]
    const fromP = conf?.ΔfromP
    if (!fromP) continue
    $model.x[_ξ] += fromP[0]
    $model.y[_ξ] += fromP[1]
  }

  // —— ④ Pen 重建 —— 主路径 + 包围盒 + 子图形（一代一次）——
  for (let _ξ = 0; _ξ < n; _ξ++) {
    const spec = specOf($model.id[_ξ])
    if (!spec) continue
    packBox($model, _ξ, spec)
    pen.reset()
    spec.geo(BOX as any, pen)
    const box = pen.seal()
    const bounds: Aabb = [[box[0][0], box[0][1]], [box[1][0], box[1][1]]]
    $model.cacheSlot(_ξ, pen.path, pen.subs.length > 0 ? pen.subs.slice() : null, bounds)
  }

  return buildRoad($model, confs, _fill)
}

/** 参数装盒 — slots 默认值 → w/h → 锚点（供 geo 做绝对坐标换算） */
function packBox($m: TsuModel, $ξ: number, $spec: ShapeSpec): void {
  const a = $ξ * 5
  const defaults = $spec.slots ?? {}
  let _s = 0
  for (const key in defaults) {
    if (_s >= 5) break
    BOX[key] = $m.aux[a + _s]
    _s++
  }
  BOX.w = $m.w[$ξ]
  // h 是**屏幕坐标差**（目标锚点 − 本槽锚点）、向上链路的 h 天然为负
  // 早期写成 `> 0 ? h : 0` 把负 h 一律归零：焰尾两个内凹弧被压平、
  // 云幕/云朵连线退化成直线并出现缺口、折线上升段被拉平导致斜率错乱
  BOX.h = Number.isFinite($m.h[$ξ]) ? $m.h[$ξ] : 0
  BOX.ox = $m.x[$ξ]
  BOX.oy = $m.y[$ξ]
}

/**
 * linkBox — 链路几何：w/h = 目标锚点 − 本槽锚点（line / curve 专用）
 * 支持极坐标锚点（Δr / Δangle°）与笛卡尔偏移（ΔfromP / ΔtoP）
 */
function linkBox($m: TsuModel, $ξ: number, $conf: RoadConf | null, $out: Record<string, number>): void {
  // Δi = 0 是合法目标（第一个槽）、不能用 conf 真假判定
  const ti = $conf && typeof $conf.Δi === 'number' ? $conf.Δi : -1
  if (ti < 0 || ti >= $m.count || ti === $ξ) {
    $out.w = 0
    $out.h = 0
    return
  }
  const polar = $conf!.Δr !== undefined || $conf!['Δangle°'] !== undefined
  let _tx = $m.x[ti]
  let _ty = $m.y[ti]
  if (polar) {
    const θ = $m.aux[ti * 5 + 1]
    const r = $conf!.Δr ?? 0
    const d = ($conf!['Δangle°'] ?? 0) * Math.PI / 180
    _tx += r * Math.cos(θ + d)
    _ty += r * Math.sin(θ + d)
  } else {
    _tx += $conf!.ΔtoP?.[0] ?? 0
    _ty += $conf!.ΔtoP?.[1] ?? 0
  }
  $out.w = _tx - ($m.x[$ξ] + ($conf!.ΔfromP?.[0] ?? 0))
  $out.h = _ty - ($m.y[$ξ] + ($conf!.ΔfromP?.[1] ?? 0))
}

/**
 * valueBox — 值几何：值经 grow（或 rect 默认映射）进局部盒
 * 不含 w/h 的补齐 —— circle / ring / arc 的尺寸由各自 slots.r 决定、
 * 不需要框架替它们写 w/h
 */
function valueBox(
  $m: TsuModel, $ξ: number, $spec: ShapeSpec,
  $ctx: CoordCtx, $ring: Int32Array, $out: Record<string, number>,
): void {
  // grow 独占「值 → 尺寸」：像素换算由它自己做（ctx 提供 v0/v1/w/h）
  // grow 写进 slots 名的值必须回写 aux（render 生长重跑 / 3D / 命中都读 aux）
  if ($spec.grow) {
    const a = $ξ * 5
    const slots = $spec.slots ?? {}
    // 先把 slots 默认值铺进盒（保证 grow 只改它想改的键）
    let _s = 0
    for (const key in slots) {
      if (_s >= 5) break
      $out[key] = $m.aux[a + _s]
      _s++
    }
    $spec.grow($m.value[$ξ], $out as any, $ctx)
    // 回写：仅写 grow 真正改动的有限值（NaN 占位交给 paths 的角度切分）
    _s = 0
    for (const key in slots) {
      if (_s >= 5) break
      const v = $out[key]
      if (Number.isFinite(v)) $m.aux[a + _s] = v
      _s++
    }
    return
  }
  // rect — 未声明 grow 时的缺省语义：值 → 柱高（形状自身约定、不是兜底）
  if ($spec.kind === 'rect') {
    $out.h = Hm_map($m.value[$ξ], $ctx.v0, $ctx.v1, 0, $ctx.h)
    return
  }
  if ($spec.kind === 'triangle') {
    // 扇区 = ⟨本槽锚点, 下一片锚点, 视图中心⟩
    // 下一片必须取**正向**邻居（seriesNext）、不能用回绕表——
    // 回绕会让末片跨图回跳、三角形反向塌陷（雷达整体消失的根因）
    let _next = $ξ + 1
    while (_next < $m.count && seriesSame(_next, $ξ, $m) === false) _next++
    if (_next >= $m.count) {
      // 末片：用本系列首片回绕、形成闭合多边形
      let _head = 0
      for (let _k = 0; _k < $ξ; _k++) if (seriesSame(_k, $ξ, $m)) { _head = _k; break }
      _next = _head
    }
    $out.w = $m.x[_next] - $m.x[$ξ]
    $out.h = $m.y[_next] - $m.y[$ξ]
    $out.ax = $ctx.w / 2 - $m.x[$ξ]
    $out.ay = $ctx.h / 2 - $m.y[$ξ]
    const a = $ξ * 5
    $m.aux[a] = $out.ax
    $m.aux[a + 1] = $out.ay
  }
}

/**
 * buildRoad — 按解析好的链路组装封闭链头槽（无人指向）先走、余下纯环后走
 */
function buildRoad($m: TsuModel, $confs: (RoadConf | null)[], $fill: number): FillRoad | null {
  const n = $m.count
  // 槽位声明 loop 才加入填充链路
  const strokeOnly = new Uint8Array(n)
  const hop = new Int32Array(n).fill(-1)
  const pointed = new Uint8Array(n)

  for (let _ξ = 0; _ξ < n; _ξ++) {
    const conf = $confs[_ξ]
    if (!conf) continue
    const ti = typeof conf.Δi === 'number' ? conf.Δi : -1
    const linked = ti >= 0 && ti < n && ti !== _ξ
    if (conf.Δloop === false) {
      strokeOnly[_ξ] = 1
      continue
    }
    if (!linked) continue
    hop[_ξ] = ti
    pointed[ti] = 1
  }

  // 填充 bbox 折叠 — 每槽世界盒（锚点 + 局部 bounds）与跳转目标锚点并入区域：
  // 底衬被裁剪到重绘区内——内部必须落在其中、否则永不再绘
  let _bx0 = Infinity, _by0 = Infinity, _bx1 = -Infinity, _by1 = -Infinity
  const fold = ($x: number, $y: number): void => {
    if ($x < _bx0) _bx0 = $x
    if ($y < _by0) _by0 = $y
    if ($x > _bx1) _bx1 = $x
    if ($y > _by1) _by1 = $y
  }
  const foldSlot = ($ξ: number): void => {
    const x = $m.x[$ξ], y = $m.y[$ξ]
    const b = $m.bounds[$ξ]
    if (b) {
      fold(x + b[0][0], y + b[0][1])
      fold(x + b[1][0], y + b[1][1])
    } else {
      fold(x, y)
    }
  }

  const out: Path2D[] = []
  const seen = new Uint8Array(n)

  const walk = ($head: number): void => {
    if (seen[$head] || strokeOnly[$head]) return
    if (hop[$head] < 0 && !pointed[$head]) return
    const path = new Path2D()
    let _cur = $head
    let _first = true
    while (_cur >= 0 && !seen[_cur] && !strokeOnly[_cur]) {
      seen[_cur] = 1
      foldSlot(_cur)
      const ti = hop[_cur]
      if (ti >= 0) fold($m.x[ti], $m.y[ti])
      hopPath($m, $confs, path, _cur, _first)
      _first = false
      _cur = ti
    }
    path.closePath()
    out.push(path)
  }

  for (let _ξ = 0; _ξ < n; _ξ++) if (!pointed[_ξ]) walk(_ξ)
  for (let _ξ = 0; _ξ < n; _ξ++) walk(_ξ)

  if (out.length === 0 || Number.isNaN($fill)) return null
  if (_bx0 > _bx1) { _bx0 = 0; _by0 = 0; _bx1 = 0; _by1 = 0 }
  return { paths: out, color: $fill, area: [[_bx0, _by0], [_bx1, _by1]] }
}

/**
 * ChainPen — 链笔：槽位局部几何平移锚点后续写进链路 Path2D（geo 纯函数的第四处重跑——既定模式）
 * 差别两点：① 坐标 + (x, y) 平移到绝对链路；② 跳过首个冗余 MOVE——整条链单一轮廓（closePath 真闭合）
 * addPath 做不到：它追加独立子路径（几何相接、拓扑独立）——雨幕永远填不满的根源
 */
class ChainPen {
  private _path: Path2D
  private _x = 0
  private _y = 0
  private _moved = false

  constructor($path: Path2D, $x: number, $y: number) {
    this._path = $path
    this._x = $x
    this._y = $y
  }

  moveTo($x: number, $y: number): void {
    if (!this._moved) { this._moved = true; return }   // 首个 MOVE 冗余：链路已在此锚点
    this._path.moveTo($x + this._x, $y + this._y)
  }

  lineTo($x: number, $y: number): void {
    this._moved = true
    this._path.lineTo($x + this._x, $y + this._y)
  }

  quadraticCurveTo($cx: number, $cy: number, $x: number, $y: number): void {
    this._moved = true
    this._path.quadraticCurveTo($cx + this._x, $cy + this._y, $x + this._x, $y + this._y)
  }

  bezierCurveTo($c1x: number, $c1y: number, $c2x: number, $c2y: number, $x: number, $y: number): void {
    this._moved = true
    this._path.bezierCurveTo($c1x + this._x, $c1y + this._y, $c2x + this._x, $c2y + this._y, $x + this._x, $y + this._y)
  }

  arc($cx: number, $cy: number, $r: number, $a0: number, $a1: number, $ccw?: boolean): void {
    this._moved = true
    this._path.arc($cx + this._x, $cy + this._y, $r, $a0, $a1, $ccw)
  }

  ellipse($cx: number, $cy: number, $rx: number, $ry: number, $rot: number, $a0: number, $a1: number, $ccw?: boolean): void {
    this._moved = true
    this._path.ellipse($cx + this._x, $cy + this._y, $rx, $ry, $rot, $a0, $a1, $ccw)
  }

  rect($x: number, $y: number, $w: number, $h: number): void {
    this._moved = true
    this._path.rect($x + this._x, $y + this._y, $w, $h)
  }

  closePath(): void {
    this._path.closePath()
  }

  /** 子图形不参与链路 — 返回离屏 Path2D 吞掉 add()（同槽双轨仅描边可见） */
  add(): Path2D {
    this._moved = true
    return new Path2D()
  }
}

/** 一次链路跳步 — 沿槽位主路径推进（子图形不参与封闭链路） */
function hopPath($m: TsuModel, $confs: (RoadConf | null)[], $path: Path2D, $ξ: number, $head: boolean): void {
  const x = $m.x[$ξ], y = $m.y[$ξ]
  if ($head) $path.moveTo(x, y)
  else $path.lineTo(x, y)                     // 非头槽：先续接到锚点、保证单一轮廓

  // geo 纯函数重跑 — 同一 Box、同一 spec、平移后续写进链路（几何只定义一处）
  const spec = specOf($m.id[$ξ])
  if (spec) {
    packBox($m, $ξ, spec)
    spec.geo(BOX as any, new ChainPen($path, x, y) as any)
  }

  // 链尾若没有指向下一点、补一条到目标锚点的连线段
  // （锚点已在 ③ 统一做过 ΔfromP 修正、此处不再叠加）
  const conf = $confs[$ξ]
  if (conf && typeof conf.Δi === 'number' && conf.Δi >= 0 && conf.Δi < $m.count) {
    const ti = conf.Δi
    $path.lineTo($m.x[ti] + (conf.ΔtoP?.[0] ?? 0), $m.y[ti] + (conf.ΔtoP?.[1] ?? 0))
  } else if (conf) {
    const polar = conf.Δr !== undefined || conf['Δangle°'] !== undefined
    if (polar) {
      // 极坐标锚点偏移仍生效（修正趟只覆盖 ΔfromP）
      const r = conf.Δr ?? 0
      const a = (conf['Δangle°'] ?? 0) * Math.PI / 180
      $path.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
    }
    // 笛卡尔尾段——锚点已带 ΔfromP 修正、不再跳接
  }
}
