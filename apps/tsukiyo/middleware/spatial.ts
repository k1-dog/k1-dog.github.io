/**
 * spatial — 数据空间三区治理。
 * 划分区（哈希网格 broad）：slot 落 cell O(1) 换桶，查询 3×3 邻域；cell key 位打包（±32768，零字符串）。
 * 聚合区（相机）：CoordMapper 注入（与后端工厂成对）；每帧无条件重算，渲染与命中同源。
 * 命中区（narrow）：hitTest 单入口统一分发 — pickRay 就绪走 hit3D（射线流），否则 hit2D（点流）；
 * 两流同构三段式：① coarse 粗筛（queryPoint 邻域候选）② fine 精筛（fine2D 点级 / ray3Body 挤出体）③ rank 排序（距离主键 + 面积次键）；纯读零写零缓存。
 * 谓词两层 — cut* 原语（cutAxis/cutPlane/cutCircle：射线 t 区间收窄）× ray3* 形体（盒/条/楔，几何参数逐字镜像 render-3d packer）；
 * 挤出体真三维测试（z=0 平面交点俯角下后移 ~halfZ·tan(pitch) → 漏检矮柱/错检邻扇）。
 */
import type { Spatial, Vec2, Vec3, Bounds, CoordMapper, Ray3 } from '../yomi'
import { Prim } from '../yomi'
import type { TsuModel } from '../m/model'
import {
  C3D, DEFAULT_CELL_SIZE, GEO_SLOTS_EACH_ELEM, HALF_EXTRUDE_Z,
  HIT_TOLERANCE, HOVER_SCALE, STROKE_LOCKED, STROKE_NORMAL, TAU,
} from '../helper/const'
import { CoordMapper2D, toWorldSpace } from '../v/camera3'
import type { WorldBox } from '../v/camera3'

// cell key 位打包常量
const CELL_KEY_OFFSET = 0x8000
const CELL_KEY_STRIDE = 0x10000

/** cell 坐标 → 数字 key */
function cellKey($cx: number, $cy: number): number {
  return ($cx + CELL_KEY_OFFSET) * CELL_KEY_STRIDE + ($cy + CELL_KEY_OFFSET)
}

// —— t 区间收窄原语（射线可见区间 [0,+∞) × 几何约束求交；收空即未命中）——

/** t 区间收窄载体 */
interface RaySpan { lo: number; hi: number }

/** 轴区间收窄 — o+td 限制在单轴 [lo,hi]（d=0 退化为原点包含） */
function cutAxis($o: number, $d: number, $lo: number, $hi: number, $span: RaySpan): boolean {
  if ($d === 0) return $o >= $lo && $o <= $hi
  let _a = ($lo - $o) / $d
  let _b = ($hi - $o) / $d
  if (_a > _b) { const s = _a; _a = _b; _b = s }
  if (_a > $span.lo) $span.lo = _a
  if (_b < $span.hi) $span.hi = _b
  return $span.lo <= $span.hi
}

/** 半空间收窄 — n·(o+td) ≤ 0 平面一侧（扇段径向边，非轴对齐故独立于 cutAxis） */
function cutPlane($n: Vec2, $o: Vec2, $d: Vec2, $span: RaySpan): boolean {
  const no = $n[0] * $o[0] + $n[1] * $o[1]
  const nd = $n[0] * $d[0] + $n[1] * $d[1]
  if (nd === 0) return no <= 0
  const bound = -no / nd
  if (nd > 0) { if (bound < $span.hi) $span.hi = bound }
  else { if (bound > $span.lo) $span.lo = bound }
  return $span.lo <= $span.hi
}

/** 圆盘收窄 — |o+td| ≤ r 二次不等式求根 */
function cutCircle($o: Vec2, $d: Vec2, $r: number, $span: RaySpan): boolean {
  const a = $d[0] * $d[0] + $d[1] * $d[1]
  const b = $o[0] * $d[0] + $o[1] * $d[1]
  const c = $o[0] * $o[0] + $o[1] * $o[1] - $r * $r
  if (a === 0) return c <= 0
  const disc = b * b - a * c
  if (disc < 0) return false
  const sq = Math.sqrt(disc)
  const t1 = (-b - sq) / a
  const t2 = (-b + sq) / a
  if (t1 > $span.lo) $span.lo = t1
  if (t2 < $span.hi) $span.hi = t2
  return $span.lo <= $span.hi
}

// —— 形体谓词（挤出体一一对应；几何参数逐字镜像 render-3d packer）——

/** 射线×盒体 — 三轴 cutAxis */
function ray3Box($ray: Ray3, $box: WorldBox): boolean {
  const span: RaySpan = { lo: 0, hi: Infinity }
  return cutAxis($ray.o[0], $ray.d[0], $box.min[0], $box.max[0], span)
    && cutAxis($ray.o[1], $ray.d[1], $box.min[1], $box.max[1], span)
    && cutAxis($ray.o[2], $ray.d[2], $box.min[2], $box.max[2], span)
}

/** 射线×条体 — 局部系 x(半长)/y(半厚)/世界 z 三轴收窄；世界→局部 = 平移到中心 + 旋转 -ang（与 packer 同源） */
function ray3Bar(
  $ray: Ray3, $cx: number, $cy: number, $ang: number,
  $hx: number, $hy: number, $halfZ: number,
): boolean {
  const cos = Math.cos($ang), sin = Math.sin($ang)
  const px = $ray.o[0] - $cx, py = $ray.o[1] - $cy
  const span: RaySpan = { lo: 0, hi: Infinity }
  return cutAxis(cos * px + sin * py, cos * $ray.d[0] + sin * $ray.d[1], -$hx, $hx, span)
    && cutAxis(-sin * px + cos * py, -sin * $ray.d[0] + cos * $ray.d[1], -$hy, $hy, span)
    && cutAxis($ray.o[2], $ray.d[2], -$halfZ, $halfZ, span)
}

/** 射线×楔体 — 扇形 = 圆盘 ∩ 两径向边半空间（凸分解）；start/sweep 世界系（Y 翻转镜像，与 packer 同源）；|sweep|≥π 凸分解失效退化整圆盘 */
function ray3Wedge(
  $ray: Ray3, $cx: number, $cy: number, $r: number,
  $startWorld: number, $sweepWorld: number, $halfZ: number,
): boolean {
  const span: RaySpan = { lo: 0, hi: Infinity }
  const o: Vec2 = [$ray.o[0] - $cx, $ray.o[1] - $cy]
  const d: Vec2 = [$ray.d[0], $ray.d[1]]
  if (!cutAxis($ray.o[2], $ray.d[2], -$halfZ, $halfZ, span)) return false
  if (!cutCircle(o, d, $r, span)) return false
  if (Math.abs($sweepWorld) < Math.PI) {
    const sa = $startWorld
    const ea = $startWorld + $sweepWorld
    // 角度域内 = 始边扫向侧 ∧ 终边逆扫向侧
    const sgn = $sweepWorld < 0 ? 1 : -1
    const ns: Vec2 = [-sgn * Math.sin(sa), sgn * Math.cos(sa)]
    const ne: Vec2 = [sgn * Math.sin(ea), -sgn * Math.cos(ea)]
    if (!cutPlane(ns, o, d, span)) return false
    if (!cutPlane(ne, o, d, span)) return false
  }
  return true
}

/** 射线×挤出体精测（按 Prim 分派形体谓词；其余原语 3D 不渲染不拾取） */
function ray3Body($m: TsuModel, $ray: Ray3, $i: number, $aabbBuf: Bounds): boolean {
  const halfZ = HALF_EXTRUDE_Z
  const t = $m.anim[$i]
  const hover = $m.hoverSlots.has($i)

  // AABB 粗筛（同点流语义）；hover 中盒是缩放后的 — 中点在缩放盒外≠未命中，故 hover 跳过粗筛
  if (!hover) {
    const aabb = $m.aabbInto($i, $aabbBuf)
    if (!ray3Box($ray, toWorldSpace(aabb, halfZ))) return false
  }

  switch ($m.type[$i]) {
    case Prim.Rect: {
      // rectToWorld 语义
      const x = $m.x[$i], y = $m.y[$i], w = $m.w[$i], h = $m.h[$i]
      let _dw = w, _dh = h * t
      if (hover) { _dw = w * HOVER_SCALE; _dh = h * t * HOVER_SCALE }
      const cx = x + w / 2
      const cy = -(y + h - _dh / 2)       // 世界系中心
      return ray3Box($ray, {
        min: [cx - _dw / 2, cy - _dh / 2, -halfZ],
        max: [cx + _dw / 2, cy + _dh / 2, halfZ],
      })
    }
    case Prim.Line: {
      // lineToWorld 语义；零长度不拾取
      const x = $m.x[$i], y = $m.y[$i]
      const dx = $m.w[$i] * t, dy = $m.h[$i] * t
      if (dx === 0 && dy === 0) return false
      const hy = (hover ? STROKE_LOCKED / STROKE_NORMAL : 1) * C3D.THICK_LINE / 2
      const ang = Math.atan2(-dy, dx)     // 世界系角度（与 packer 同源）
      return ray3Bar(
        $ray, x + dx / 2, -(y + dy / 2), ang,
        Math.hypot(dx, dy) / 2, hy, halfZ,
      )
    }
    case Prim.Arc: {
      // sectorToWorld 语义
      const a = $i * GEO_SLOTS_EACH_ELEM
      let _r = $m.aux[a] * t
      if (hover) _r *= HOVER_SCALE
      const startW = -$m.aux[a + 1]
      const sweepW = -($m.aux[a + 2] - $m.aux[a + 1]) * t
      return ray3Wedge(
        $ray, $m.x[$i], -$m.y[$i], _r, startW, sweepW, halfZ,
      )
    }
  }
  return false   // 其余原语 3D 不渲染不拾取
}

// —— 2D 命中距离谓词（hit2 命名空间 — hover 邻近排序与兜底精筛共用）——

/** 点到线段距离平方（零长度段退化为到端点距离） */
function hit2SegDist($x: number, $y: number, $dx: number, $dy: number, $px: number, $py: number): number {
  const ex = $x + $dx, ey = $y + $dy
  const vx = ex - $x, vy = ey - $y
  const wx = $px - $x, wy = $py - $y
  const lenSq = vx * vx + vy * vy
  // degenerate segment — distance to the start point
  if (lenSq === 0) return wx * wx + wy * wy
  // clamp projection parameter onto [0,1]
  let t = (wx * vx + wy * vy) / lenSq
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const cx = $x + vx * t, cy = $y + vy * t
  const ddx = $px - cx, ddy = $py - cy
  return ddx * ddx + ddy * ddy
}

/** 光标到元素距离平方 — Line/Curve 精确到线段（顶点胜出线段中部），其余 AABB 钳制（盒内为 0） */
function hit2Dist($m: TsuModel, $i: number, $px: number, $py: number, $aabbBuf: Bounds): number {
  // stroke prims — exact point-to-segment distance so vertices beat mid-segments
  // (segment distance >= AABB distance by construction, no clamp needed)
  const t = $m.type[$i]
  if (t === Prim.Line || t === Prim.Curve) {
    return hit2SegDist($m.x[$i], $m.y[$i], $m.w[$i], $m.h[$i], $px, $py)
  }
  const aabb = $m.aabbInto($i, $aabbBuf)
  const [min, max] = aabb
  // clamp cursor into AABB — zero when inside
  const cx = $px < min[0] ? min[0] : $px > max[0] ? max[0] : $px
  const cy = $py < min[1] ? min[1] : $py > max[1] ? max[1] : $py
  const dx = $px - cx, dy = $py - cy
  return dx * dx + dy * dy
}

export class Grid implements Spatial {
  // —— 划分区 ——

  private cells = new Map<number, Set<number>>()
  private slotCells = new Map<number, number[]>()
  private cellSize: number

  // —— 聚合区 ——

  /** 取景相机（构造注入；与渲染后端成对创建） */
  private camera: CoordMapper

  // —— 命中区 ——

  private aabbBuf: Bounds = [[0, 0], [0, 0]]   // 复用缓冲（零分配）

  constructor(cellSize = DEFAULT_CELL_SIZE, $camera?: CoordMapper) {
    this.cellSize = cellSize
    this.camera = $camera ?? new CoordMapper2D()
  }

  // —— 聚合区 API（相机转发，语义见 yomi.ts CoordMapper）——

  get is3D(): boolean { return this.camera.is3D }

  frame($m: TsuModel, $w: number, $h: number): boolean {
    return this.camera.frame($m, $w, $h)
  }

  zoomBy($delta: number, $ax?: number, $ay?: number): void {
    this.camera.zoomBy($delta, $ax, $ay)
  }

  orbitBy($dx: number, $dy: number): void {
    this.camera.orbitBy($dx, $dy)
  }

  worldToCoordXY($sx: number, $sy: number): Vec2 | null {
    return this.camera.worldToCoordXY($sx, $sy)
  }

  pickRay($sx: number, $sy: number): Ray3 | null {
    return this.camera.pickRay($sx, $sy)
  }

  get cameraMatrix(): Float32Array | null {
    return this.camera.clipMatrix
  }

  get cameraSight(): Vec3 | null {
    return this.camera.sight
  }

  outOfSight($bounds: Bounds, $w: number, $h: number): boolean {
    return this.camera.outOfSight($bounds, $w, $h)
  }

  // —— 命中区 API ——

  /** 统一分发入口 — pickRay 就绪走 3D 射线流，否则 2D 点流（两流同构：粗筛→精筛→排序） */
  hitTest($m: TsuModel, $sx: number, $sy: number): number[] | null {
    const ray = this.pickRay($sx, $sy)
    return ray ? this.hit3D($m, ray) : this.hit2D($m, $sx, $sy)
  }

  /** 命中排序 — 主键光标距离升序（Line/Curve 精确到线段）；次键 AABB 面积升序（更小更具体元素优先 — 共享顶点上零长度末点胜出） */
  private rankHits($m: TsuModel, $hits: number[], $sx: number, $sy: number): void {
    if ($hits.length < 2) return
    const areaOf = ($i: number): number => {
      const b = $m.aabbInto($i, this.aabbBuf)
      return (b[1][0] - b[0][0]) * (b[1][1] - b[0][1])
    }
    const areas = new Map<number, number>()
    for (const i of $hits) areas.set(i, areaOf(i))
    $hits.sort(($a: number, $b: number) => {
      const da = hit2Dist($m, $a, $sx, $sy, this.aabbBuf)
      const db = hit2Dist($m, $b, $sx, $sy, this.aabbBuf)
      if (da !== db) return da - db
      return (areas.get($a) ?? 0) - (areas.get($b) ?? 0)
    })
  }

  /** 2D 点级精筛 — AABB + Circle 圆心距 + Arc 半径角度 + Triangle 重心（多原语收集全部命中） */
  private fine2D($m: TsuModel, $candidates: number[], $px: number, $py: number): number[] {
    const hits: number[] = []
    for (const slot of $candidates) {
      if (slot < 0 || slot >= $m.count) continue
      const aabb = $m.aabbInto(slot, this.aabbBuf)
      const [min, max] = aabb
      if (
        $px < min[0] || $px > max[0] ||
        $py < min[1] || $py > max[1]
      ) continue

      // Circle 精筛 — 圆心距（AABB 四角误命中剔除）
      if ($m.type[slot] === Prim.Circle) {
        const r = $m.aux[slot * GEO_SLOTS_EACH_ELEM]
        const dx = $px - $m.x[slot]
        const dy = $py - $m.y[slot]
        if (dx * dx + dy * dy > r * r) continue
      }

      // Arc 精筛 — 半径 + 角度（饼图 AABB 全重叠需角度区分）
      if ($m.type[slot] === Prim.Arc) {
        const a = slot * GEO_SLOTS_EACH_ELEM
        const r = $m.aux[a]
        const cx = $m.x[slot]
        const cy = $m.y[slot]
        const dx = $px - cx
        const dy = $py - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > r) continue
        // atan2 ∈ [-π,π] 需归一化到扇形范围
        let _ang = Math.atan2(dy, dx)
        const startAng = $m.aux[a + 1]
        const endAng = $m.aux[a + 2]
        while (_ang < startAng) _ang += TAU
        if (_ang > endAng) continue
      }

      // Triangle 精筛 — 重心坐标法（三叉积同号即在内部）
      if ($m.type[slot] === Prim.Triangle) {
        const a = slot * GEO_SLOTS_EACH_ELEM
        const v0x = $m.x[slot], v0y = $m.y[slot]
        const v1x = v0x + $m.w[slot], v1y = v0y + $m.h[slot]
        const v2x = v0x + $m.aux[a], v2y = v0y + $m.aux[a + 1]
        const d1 = ($px - v1x) * (v0y - v1y) - (v0x - v1x) * ($py - v1y)
        const d2 = ($px - v2x) * (v1y - v2y) - (v1x - v2x) * ($py - v2y)
        const d3 = ($px - v0x) * (v2y - v0y) - (v2x - v0x) * ($py - v0y)
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0
        if (hasNeg && hasPos) continue
      }

      hits.push(slot)
    }
    return hits
  }

  /** 2D 点流 — ① 粗筛（反解 + 邻域候选）② 精筛（fine2D，空手时邻近兜底）③ 排序 */
  private hit2D($m: TsuModel, $sx: number, $sy: number): number[] | null {
    // ① 粗筛 — 反解视线 + 3×3 邻域候选
    const pos = this.worldToCoordXY($sx, $sy)
    if (!pos) return null
    const candidates = this.queryPoint(pos)

    // ② 精筛 — 点级精测
    const hits = this.fine2D($m, candidates, pos[0], pos[1])

    // 空手兜底 — 邻近精筛：取距离最小候选，≤ HIT_TOLERANCE 即命中
    // （Line/Curve 按点到线段距离，天然覆盖零长度末点顶点）
    if (hits.length === 0 && candidates.length > 0) {
      let _best = -1
      let _bestDist = Infinity
      for (const slot of candidates) {
        if (slot < 0 || slot >= $m.count) continue
        const d = hit2Dist($m, slot, pos[0], pos[1], this.aabbBuf)
        if (d < _bestDist) { _bestDist = d; _best = slot }
      }
      if (_best >= 0 && _bestDist <= HIT_TOLERANCE * HIT_TOLERANCE) hits.push(_best)
    }

    // ③ 排序 — 邻近优先（SoA 坐标系；pos 即反解后光标）
    this.rankHits($m, hits, pos[0], pos[1])
    return hits
  }

  /** 3D 射线流 — ① 粗筛（z 板夹取交点 + 邻域候选）② 精筛（ray3Body 挤出体）③ 排序 */
  private hit3D($m: TsuModel, $ray: Ray3): number[] {
    const halfZ = HALF_EXTRUDE_Z
    const hits: number[] = []

    // ① 粗筛 — z 板夹取（视线穿 [−halfZ,+halfZ] 段中点，一次粗筛兼得候选锚点）
    if ($ray.d[2] === 0) return hits
    let _t0 = (-halfZ - $ray.o[2]) / $ray.d[2]
    let _t1 = (halfZ - $ray.o[2]) / $ray.d[2]
    if (_t0 > _t1) { const s = _t0; _t0 = _t1; _t1 = s }
    if (_t1 <= 0) return hits
    const tm = (Math.max(_t0, 0) + _t1) / 2
    const mid: Vec2 = [$ray.o[0] + $ray.d[0] * tm, -($ray.o[1] + $ray.d[1] * tm)]
    const candidates = this.queryPoint(mid)

    // ② 精筛 — 挤出体精测（逐字镜像 packer）
    for (const slot of candidates) {
      if (slot < 0 || slot >= $m.count) continue
      if (ray3Body($m, $ray, slot, this.aabbBuf)) hits.push(slot)
    }

    // ③ 排序 — 邻近优先（SoA 坐标系；mid 即射线 z=0 板交点）
    this.rankHits($m, hits, mid[0], mid[1])
    return hits
  }

  // —— 划分区 API ——

  /** per-slot bounds snapshot (insert-time) — pre-move AABB reads for
   *  stale-pixel clearing; Map because slots are sparse (0..count) */
  private slotBounds = new Map<number, Bounds>()

  // pre-update AABB of an indexed element — the PREVIOUS frame's bounds
  // while the layering pass has not re-inserted yet (ghost-pixel fix);
  // null when the element has no spatial record (first appearance)
  aabbOf($slot: number): Bounds | null {
    return this.slotBounds.get($slot) ?? null
  }

  // 覆盖分桶 — AABB 覆盖的所有 cell 登记 slot（跨 cellSize 元素天然不漏检）
  insert($slot: number, $bounds: Bounds): void {
    this.slotBounds.set($slot, $bounds)
    const kx0 = Math.floor($bounds[0][0] / this.cellSize)
    const kx1 = Math.floor($bounds[1][0] / this.cellSize)
    const ky0 = Math.floor($bounds[0][1] / this.cellSize)
    const ky1 = Math.floor($bounds[1][1] / this.cellSize)
    const keys: number[] = this.slotCells.get($slot) ?? []
    keys.length = 0
    for (let _x = kx0; _x <= kx1; _x++) {
      for (let _y = ky0; _y <= ky1; _y++) {
        const k = cellKey(_x, _y)
        let _cell = this.cells.get(k)
        if (!_cell) {
          _cell = new Set()
          this.cells.set(k, _cell)
        }
        _cell.add($slot)
        keys.push(k)
      }
    }
    this.slotCells.set($slot, keys)   // key 全集 — remove 精确撤回
  }

  // 撤桶 — key 全集逐格删除
  remove($slot: number): void {
    this.slotBounds.delete($slot)
    const keys = this.slotCells.get($slot)
    if (keys === undefined) return
    for (const k of keys) {
      const cell = this.cells.get(k)
      if (cell) {
        cell.delete($slot)
        if (cell.size === 0) this.cells.delete(k)   // 空桶即除 — cells 不无限膨胀
      }
    }
    this.slotCells.delete($slot)
  }

  // 换桶 — 撤旧登新
  update($slot: number, $bounds: Bounds): void {
    this.remove($slot)
    this.insert($slot, $bounds)
  }

  // 点查询 — 3×3 邻域
  queryPoint($p: Vec2): number[] {
    const cx = Math.floor($p[0] / this.cellSize)
    const cy = Math.floor($p[1] / this.cellSize)
    const result: number[] = []
    for (let _dx = -1; _dx <= 1; _dx++) {
      for (let _dy = -1; _dy <= 1; _dy++) {
        const cell = this.cells.get(cellKey(cx + _dx, cy + _dy))
        if (cell) result.push(...cell)
      }
    }
    return result
  }

  clear(): void {
    this.cells.clear()
    this.slotCells.clear()
  }
}
