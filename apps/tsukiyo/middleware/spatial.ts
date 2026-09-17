/**
 * spatial — 数据空间三区治理。
 * 划分区（哈希网格 broad）：slot 落 cell O(1) 换桶，查询 3×3 邻域；cell key 位打包（±32768，零字符串）。
 * 聚合区（相机）：CoordMapper 注入（与后端工厂成对）；每帧无条件重算，渲染与命中同源。
 * 命中区（narrow）：onHitTest 单入口自选流（射线流/点流），纯读零写零缓存。
 * ray* 谓词族 — 凸域相交统一"t 区间收窄"，几何参数逐字镜像 render-3d packer；
 * 挤出体真三维测试（z=0 平面交点俯角下后移 ~halfZ·tan(pitch) → 漏检矮柱/错检邻扇）。
 */
import type { Spatial, Vec2, Vec3, Bounds, CoordMapper, Ray3 } from '../yomi'
import { Prim } from '../yomi'
import type { TsuModel } from '../m/model'
import {
  C3D, DEFAULT_CELL_SIZE, GEO_SLOTS_EACH_ELEM, HALF_EXTRUDE_Z,
  HOVER_SCALE, STROKE_LOCKED, STROKE_NORMAL, TAU,
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

// —— 射线谓词 — 凸域相交统一"t 区间收窄"（初始 [0,+∞)，收空即未命中）——

/** t 区间收窄载体 */
interface RaySpan { lo: number; hi: number }

/** 单轴 slab — o+td ∈ [lo,hi] 的 t 收窄（d=0 退化为原点包含） */
function slab($o: number, $d: number, $lo: number, $hi: number, $span: RaySpan): boolean {
  if ($d === 0) return $o >= $lo && $o <= $hi
  let _a = ($lo - $o) / $d
  let _b = ($hi - $o) / $d
  if (_a > _b) { const s = _a; _a = _b; _b = s }
  if (_a > $span.lo) $span.lo = _a
  if (_b < $span.hi) $span.hi = _b
  return $span.lo <= $span.hi
}

/** 半空间 n·(o+td) ≤ 0 收窄（扇段径向边，非轴对齐故独立于 slab） */
function halfspace($n: Vec2, $o: Vec2, $d: Vec2, $span: RaySpan): boolean {
  const no = $n[0] * $o[0] + $n[1] * $o[1]
  const nd = $n[0] * $d[0] + $n[1] * $d[1]
  if (nd === 0) return no <= 0
  const bound = -no / nd
  if (nd > 0) { if (bound < $span.hi) $span.hi = bound }
  else { if (bound > $span.lo) $span.lo = bound }
  return $span.lo <= $span.hi
}

/** 圆盘 |o+td| ≤ r 收窄（二次不等式求根） */
function disk($o: Vec2, $d: Vec2, $r: number, $span: RaySpan): boolean {
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

/** 射线×盒 — 三轴 slab */
function rayBox($ray: Ray3, $box: WorldBox): boolean {
  const span: RaySpan = { lo: 0, hi: Infinity }
  return slab($ray.o[0], $ray.d[0], $box.min[0], $box.max[0], span)
    && slab($ray.o[1], $ray.d[1], $box.min[1], $box.max[1], span)
    && slab($ray.o[2], $ray.d[2], $box.min[2], $box.max[2], span)
}

/** 射线×条 — 局部系 x(半长)/y(半厚)/世界 z 三轴 slab；世界→局部 = 平移到中心 + 旋转 -ang（与 packer 同源） */
function rayBar(
  $ray: Ray3, $cx: number, $cy: number, $ang: number,
  $hx: number, $hy: number, $halfZ: number,
): boolean {
  const cos = Math.cos($ang), sin = Math.sin($ang)
  const px = $ray.o[0] - $cx, py = $ray.o[1] - $cy
  const span: RaySpan = { lo: 0, hi: Infinity }
  return slab(cos * px + sin * py, cos * $ray.d[0] + sin * $ray.d[1], -$hx, $hx, span)
    && slab(-sin * px + cos * py, -sin * $ray.d[0] + cos * $ray.d[1], -$hy, $hy, span)
    && slab($ray.o[2], $ray.d[2], -$halfZ, $halfZ, span)
}

/** 射线×楔 — 扇形 = 圆盘 ∩ 两径向边半空间（凸分解）；start/sweep 世界系（Y 翻转镜像，与 packer 同源）；|sweep|≥π 凸分解失效退化整圆盘 */
function rayWedge(
  $ray: Ray3, $cx: number, $cy: number, $r: number,
  $startWorld: number, $sweepWorld: number, $halfZ: number,
): boolean {
  const span: RaySpan = { lo: 0, hi: Infinity }
  const o: Vec2 = [$ray.o[0] - $cx, $ray.o[1] - $cy]
  const d: Vec2 = [$ray.d[0], $ray.d[1]]
  if (!slab($ray.o[2], $ray.d[2], -$halfZ, $halfZ, span)) return false
  if (!disk(o, d, $r, span)) return false
  if (Math.abs($sweepWorld) < Math.PI) {
    const sa = $startWorld
    const ea = $startWorld + $sweepWorld
    // 角度域内 = 始边扫向侧 ∧ 终边逆扫向侧
    const sgn = $sweepWorld < 0 ? 1 : -1
    const ns: Vec2 = [-sgn * Math.sin(sa), sgn * Math.cos(sa)]
    const ne: Vec2 = [sgn * Math.sin(ea), -sgn * Math.cos(ea)]
    if (!halfspace(ns, o, d, span)) return false
    if (!halfspace(ne, o, d, span)) return false
  }
  return true
}

/** 射线×挤出体精测（逐字镜像 packer：Rect 盒体/Line 条体/Arc 楔体；其余原语 3D 不渲染不拾取） */
function rayBody($m: TsuModel, $ray: Ray3, $i: number, $aabbBuf: Bounds): boolean {
  const halfZ = HALF_EXTRUDE_Z
  const t = $m.anim[$i]
  const hover = $m.hoverSlots.has($i)

  // AABB 粗筛（同点流语义）；hover 中盒是缩放后的 — 中点在缩放盒外≠未命中，故 hover 跳过粗筛
  if (!hover) {
    const aabb = $m.aabbInto($i, $aabbBuf)
    if (!rayBox($ray, toWorldSpace(aabb, halfZ))) return false
  }

  switch ($m.type[$i]) {
    case Prim.Rect: {
      // rectToWorld 语义
      const x = $m.x[$i], y = $m.y[$i], w = $m.w[$i], h = $m.h[$i]
      let _dw = w, _dh = h * t
      if (hover) { _dw = w * HOVER_SCALE; _dh = h * t * HOVER_SCALE }
      const cx = x + w / 2
      const cy = -(y + h - _dh / 2)       // 世界系中心
      return rayBox($ray, {
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
      return rayBar(
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
      return rayWedge(
        $ray, $m.x[$i], -$m.y[$i], _r, startW, sweepW, halfZ,
      )
    }
  }
  return false   // 其余原语 3D 不渲染不拾取
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

  // 统一入口 — 3D 射线就绪走射线流，否则点流
  onHitTest($m: TsuModel, $sx: number, $sy: number): number[] | null {
    const ray = this.pickRay($sx, $sy)
    return ray ? this.hitByRay($m, ray) : this.hitByPoint($m, $sx, $sy)
  }

  // 射线流 — ① z 板夹取（视线穿 [−halfZ,+halfZ] 段中点，一次粗筛兼得候选）② 候选 ③ rayBody 精测
  private hitByRay($m: TsuModel, $ray: Ray3): number[] {
    const halfZ = HALF_EXTRUDE_Z
    const hits: number[] = []

    // ① z 板夹取
    if ($ray.d[2] !== 0) {
      let _t0 = (-halfZ - $ray.o[2]) / $ray.d[2]
      let _t1 = (halfZ - $ray.o[2]) / $ray.d[2]
      if (_t0 > _t1) { const s = _t0; _t0 = _t1; _t1 = s }
      if (_t1 > 0) {
        const tm = (Math.max(_t0, 0) + _t1) / 2
        const mid: Vec2 = [$ray.o[0] + $ray.d[0] * tm, -($ray.o[1] + $ray.d[1] * tm)]
        // ②③ 候选 + 精测
        for (const slot of this.queryPoint(mid)) {
          if (slot < 0 || slot >= $m.count) continue
          if (rayBody($m, $ray, slot, this.aabbBuf)) hits.push(slot)
        }
        return hits
      }
    }
    return hits
  }

  // 点流 — ① 反解 ② 候选 ③ 内联精测（AABB + Arc 角度 + Triangle 重心；多原语收集全部命中）
  private hitByPoint($m: TsuModel, $sx: number, $sy: number): number[] | null {
    // ① 反解
    const pos = this.worldToCoordXY($sx, $sy)
    if (!pos) return null

    // ② 候选
    const candidates = this.queryPoint(pos)

    // ③ 精测
    const hits: number[] = []
    for (const slot of candidates) {
      if (slot < 0 || slot >= $m.count) continue
      const aabb = $m.aabbInto(slot, this.aabbBuf)
      const [min, max] = aabb
      if (
        pos[0] < min[0] || pos[0] > max[0] ||
        pos[1] < min[1] || pos[1] > max[1]
      ) continue

      // Arc 精筛 — 半径 + 角度（饼图 AABB 全重叠需角度区分）
      if ($m.type[slot] === Prim.Arc) {
        const a = slot * GEO_SLOTS_EACH_ELEM
        const r = $m.aux[a]
        const cx = $m.x[slot]
        const cy = $m.y[slot]
        const dx = pos[0] - cx
        const dy = pos[1] - cy
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
        const px = pos[0], py = pos[1]
        const d1 = (px - v1x) * (v0y - v1y) - (v0x - v1x) * (py - v1y)
        const d2 = (px - v2x) * (v1y - v2y) - (v1x - v2x) * (py - v2y)
        const d3 = (px - v0x) * (v2y - v0y) - (v2x - v0x) * (py - v0y)
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0
        if (hasNeg && hasPos) continue
      }

      hits.push(slot)
    }
    return hits
  }

  // —— 划分区 API ——

  // 覆盖分桶 — AABB 覆盖的所有 cell 登记 slot（跨 cellSize 元素天然不漏检）
  insert($slot: number, $bounds: Bounds): void {
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

  // 范围查询 — 遍历覆盖的所有 cell
  queryRange($bounds: Bounds): number[] {
    const minKx = Math.floor($bounds[0][0] / this.cellSize)
    const maxKx = Math.floor($bounds[1][0] / this.cellSize)
    const minKy = Math.floor($bounds[0][1] / this.cellSize)
    const maxKy = Math.floor($bounds[1][1] / this.cellSize)

    const result: number[] = []
    for (let _x = minKx; _x <= maxKx; _x++) {
      for (let _y = minKy; _y <= maxKy; _y++) {
        const cell = this.cells.get(cellKey(_x, _y))
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
