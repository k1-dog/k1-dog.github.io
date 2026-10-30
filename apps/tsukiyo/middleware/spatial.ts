/**
 * spatial — 空间域：槽位 AABB 派生（boxInto / contentArea）、带旧位快照的
 * 哈希格粗筛、统一命中测试（2D 点流 / 3D 射线流——粗筛 → 精筛 → 排序）
 */
import type { Vec2, Vec3, Aabb, CoordMapper, Ray3 } from '../yomi'
import type { TsuModel } from '../m/model'
import { specOf } from '../v/shape'
import {
  C3D, DEFAULT_CELL_SIZE, HALF_EXTRUDE_Z,
  HIT_TOLERANCE, HOVER_SCALE, STROKE_LOCKED, STROKE_NORMAL,
  AABB_HIT_PAD, RING_WIDTH_RATIO,
} from '../helper/const'

// —— 槽位 AABB 派生 ——
// 单一来源：路径由 Pen 在 shape / paths 阶段记录、这里只把局部包围盒
// 平移到锚点即为槽位盒（零形状分支——自定义与内置形状完全同构）

/** 模块级离屏 ctx — isPointInPath 精确命中（零每帧分配） */
const HIT_CTX: CanvasRenderingContext2D | null =
  typeof document !== 'undefined'
    ? document.createElement('canvas').getContext('2d')
    : null

/** 把槽 ξ 的 AABB 写入 $out（min/max 归一化） */
export function boxInto($m: TsuModel, $ξ: number, $out: Aabb): Aabb {
  const x = $m.x[$ξ], y = $m.y[$ξ]
  const b = $m.bounds[$ξ]
  const spec = specOf($m.id[$ξ])
  const pad = spec && !spec.fill ? AABB_HIT_PAD : 0

  if (!b) {
    // 未就绪 — 退化为零盒（不至于命中一切都失败）
    $out[0][0] = x; $out[0][1] = y
    $out[1][0] = x; $out[1][1] = y
    return $out
  }

  // 环 — 线宽外扩
  if (spec?.kind === 'ring') {
    const r = $m.aux[$ξ * 5]
    const rp = Math.max(1, r * RING_WIDTH_RATIO) / 2 + 1
    $out[0][0] = x + b[0][0] - rp; $out[0][1] = y + b[0][1] - rp
    $out[1][0] = x + b[1][0] + rp; $out[1][1] = y + b[1][1] + rp
    return $out
  }

  $out[0][0] = x + b[0][0] - pad; $out[0][1] = y + b[0][1] - pad
  $out[1][0] = x + b[1][0] + pad; $out[1][1] = y + b[1][1] + pad
  return $out
}

const contentBuf: Aabb = [[0, 0], [0, 0]]

/** 内容区 — 全体槽集合、取景唯一来源 */
export function contentArea($m: TsuModel): Aabb | null {
  let _x0 = Infinity, _y0 = Infinity, _x1 = -Infinity, _y1 = -Infinity
  for (let _ξ = 0; _ξ < $m.count; _ξ++) {
    boxInto($m, _ξ, contentBuf)
    if (contentBuf[0][0] < _x0) _x0 = contentBuf[0][0]
    if (contentBuf[0][1] < _y0) _y0 = contentBuf[0][1]
    if (contentBuf[1][0] > _x1) _x1 = contentBuf[1][0]
    if (contentBuf[1][1] > _y1) _y1 = contentBuf[1][1]
  }
  if (_x0 > _x1) return null
  return [[_x0, _y0], [_x1, _y1]]
}

// —— 格键打包 ——
const CELL_KEY_OFFSET = 0x8000
const CELL_KEY_STRIDE = 0x10000

const cellKey = ($cx: number, $cy: number): number =>
  ($cx + CELL_KEY_OFFSET) * CELL_KEY_STRIDE + ($cy + CELL_KEY_OFFSET)

// —— 射线区间收窄（t ∈ [0,∞) × 几何）——

interface RaySpan { lo: number; hi: number }

function cutAxis($o: number, $d: number, $lo: number, $hi: number, $span: RaySpan): boolean {
  if ($d === 0) return $o >= $lo && $o <= $hi
  let _a = ($lo - $o) / $d
  let _b = ($hi - $o) / $d
  if (_a > _b) { const s = _a; _a = _b; _b = s }
  if (_a > $span.lo) $span.lo = _a
  if (_b < $span.hi) $span.hi = _b
  return $span.lo <= $span.hi
}

function cutPlane($n: Vec2, $o: Vec2, $d: Vec2, $span: RaySpan): boolean {
  const no = $n[0] * $o[0] + $n[1] * $o[1]
  const nd = $n[0] * $d[0] + $n[1] * $d[1]
  if (nd === 0) return no <= 0
  const bound = -no / nd
  if (nd > 0) { if (bound < $span.hi) $span.hi = bound }
  else { if (bound > $span.lo) $span.lo = bound }
  return $span.lo <= $span.hi
}

function cutCircle($o: Vec2, $d: Vec2, $r: number, $span: RaySpan): boolean {
  const a = $d[0] * $d[0] + $d[1] * $d[1]
  const b = $o[0] * $d[0] + $o[1] * $d[1]
  const c = $o[0] * $o[0] + $o[1] * $o[1] - $r * $r
  if (a === 0) return c <= 0
  const disc = b * b - a * c
  if (disc < 0) return false
  const sq = Math.sqrt(disc)
  if ((-b - sq) / a > $span.lo) $span.lo = (-b - sq) / a
  if ((-b + sq) / a < $span.hi) $span.hi = (-b + sq) / a
  return $span.lo <= $span.hi
}

// —— 体判定（几何与 render 打包器镜像）——

function ray3Box($ray: Ray3, $min: Vec3, $max: Vec3): boolean {
  const span: RaySpan = { lo: 0, hi: Infinity }
  return cutAxis($ray.o[0], $ray.d[0], $min[0], $max[0], span)
    && cutAxis($ray.o[1], $ray.d[1], $min[1], $max[1], span)
    && cutAxis($ray.o[2], $ray.d[2], $min[2], $max[2], span)
}

function ray3Bar($ray: Ray3, $cx: number, $cy: number, $ang: number, $hx: number, $hy: number, $halfZ: number): boolean {
  const cos = Math.cos($ang), sin = Math.sin($ang)
  const px = $ray.o[0] - $cx, py = $ray.o[1] - $cy
  const span: RaySpan = { lo: 0, hi: Infinity }
  return cutAxis(cos * px + sin * py, cos * $ray.d[0] + sin * $ray.d[1], -$hx, $hx, span)
    && cutAxis(-sin * px + cos * py, -sin * $ray.d[0] + cos * $ray.d[1], -$hy, $hy, span)
    && cutAxis($ray.o[2], $ray.d[2], -$halfZ, $halfZ, span)
}

function ray3Wedge($ray: Ray3, $cx: number, $cy: number, $r: number, $start: number, $sweep: number, $halfZ: number): boolean {
  const span: RaySpan = { lo: 0, hi: Infinity }
  const o: Vec2 = [$ray.o[0] - $cx, $ray.o[1] - $cy]
  const d: Vec2 = [$ray.d[0], $ray.d[1]]
  if (!cutAxis($ray.o[2], $ray.d[2], -$halfZ, $halfZ, span)) return false
  if (!cutCircle(o, d, $r, span)) return false
  if (Math.abs($sweep) < Math.PI) {
    const sa = $start
    const ea = $start + $sweep
    const sgn = $sweep < 0 ? 1 : -1
    if (!cutPlane([-sgn * Math.sin(sa), sgn * Math.cos(sa)], o, d, span)) return false
    if (!cutPlane([sgn * Math.sin(ea), -sgn * Math.cos(ea)], o, d, span)) return false
  }
  return true
}

const bodyBuf: Aabb = [[0, 0], [0, 0]]

/** 3D body test — spec.three 声明挤出语义（缺省不挤出、永不命中） */
function ray3Body($m: TsuModel, $ray: Ray3, $ξ: number): boolean {
  const halfZ = HALF_EXTRUDE_Z
  const t = $m.anim[$ξ]
  const hover = $m.hoverSlots.has($ξ)
  const spec = specOf($m.id[$ξ])
  if (!spec) return false

  if (!hover) {
    const box = boxInto($m, $ξ, bodyBuf)
    if (!ray3Box($ray,
      [box[0][0], -box[1][1], -halfZ],
      [box[1][0], -box[0][1], halfZ],
    )) return false
  }

  const three = spec.three
  if (!three) return false

  if (three === 'box' || three === 'bar') {
    const x = $m.x[$ξ], y = $m.y[$ξ], w = $m.w[$ξ], h = $m.h[$ξ]
    let _dw = w, _dh = h * t
    if (hover) { _dw = w * HOVER_SCALE; _dh = h * t * HOVER_SCALE }
    // 锚点 = 柱顶中心、柱身向下（与 render-3d 的 rectToWorld 同源）
    const cx = x
    const cy = -(y + _dh / 2)
    return ray3Box($ray,
      [cx - _dw / 2, cy - _dh / 2, -halfZ],
      [cx + _dw / 2, cy + _dh / 2, halfZ],
    )
  }

  // sector — 极坐标楔形
  const a = $ξ * 5
  let _r = $m.aux[a] * t
  if (hover) _r *= HOVER_SCALE
  return ray3Wedge($ray, $m.x[$ξ], -$m.y[$ξ], _r,
    -$m.aux[a + 1], -($m.aux[a + 2] - $m.aux[a + 1]) * t, halfZ)
}

// —— 2D 距离判定 ——

function segDist($x: number, $y: number, $dx: number, $dy: number, $px: number, $py: number): number {
  const wx = $px - $x, wy = $py - $y
  const lenSq = $dx * $dx + $dy * $dy
  if (lenSq === 0) return wx * wx + wy * wy
  let _t = (wx * $dx + wy * $dy) / lenSq
  _t = _t < 0 ? 0 : _t > 1 ? 1 : _t
  const ddx = $px - ($x + $dx * _t), ddy = $py - ($y + $dy * _t)
  return ddx * ddx + ddy * ddy
}

/** cursor distance² — 描边类按段精确、其余夹到包围盒（spec.kind 声明） */
function cursorDist($m: TsuModel, $ξ: number, $px: number, $py: number): number {
  const spec = specOf($m.id[$ξ])
  if (!spec?.fill && (spec?.kind === 'line' || spec?.kind === 'curve')) {
    return segDist($m.x[$ξ], $m.y[$ξ], $m.w[$ξ], $m.h[$ξ], $px, $py)
  }
  const box = boxInto($m, $ξ, bodyBuf)
  const [min, max] = box
  const cx = $px < min[0] ? min[0] : $px > max[0] ? max[0] : $px
  const cy = $py < min[1] ? min[1] : $py > max[1] ? max[1] : $py
  const dx = $px - cx, dy = $py - cy
  return dx * dx + dy * dy
}

export class TsuSpace {
  /** cell → 槽集合（粗筛） */
  private cells = new Map<number, Set<number>>()
  /** 每槽旧位快照 — 上一次通过的 AABB（残影清除 + 桶回滚——
   *  格区间由它重算故无需反向索引表） */
  private slotAabb = new Map<number, Aabb>()
  private aabbBuf: Aabb = [[0, 0], [0, 0]]

  // —— 旧位存取 ——

  aabbOf($ξ: number): Aabb | null {
    return this.slotAabb.get($ξ) ?? null
  }

  /** 桶回滚 — 格区间来自存储的 AABB 本身 */
  remove($ξ: number): void {
    const old = this.slotAabb.get($ξ)
    if (!old) return
    const kx0 = Math.floor(old[0][0] / DEFAULT_CELL_SIZE)
    const kx1 = Math.floor(old[1][0] / DEFAULT_CELL_SIZE)
    const ky0 = Math.floor(old[0][1] / DEFAULT_CELL_SIZE)
    const ky1 = Math.floor(old[1][1] / DEFAULT_CELL_SIZE)
    for (let _x = kx0; _x <= kx1; _x++) {
      for (let _y = ky0; _y <= ky1; _y++) {
        const k = cellKey(_x, _y)
        const cell = this.cells.get(k)
        if (!cell) continue
        cell.delete($ξ)
        if (cell.size === 0) this.cells.delete(k)
      }
    }
    this.slotAabb.delete($ξ)
  }

  insert($ξ: number, $a: Aabb): void {
    this.slotAabb.set($ξ, [[$a[0][0], $a[0][1]], [$a[1][0], $a[1][1]]])
    const kx0 = Math.floor($a[0][0] / DEFAULT_CELL_SIZE)
    const kx1 = Math.floor($a[1][0] / DEFAULT_CELL_SIZE)
    const ky0 = Math.floor($a[0][1] / DEFAULT_CELL_SIZE)
    const ky1 = Math.floor($a[1][1] / DEFAULT_CELL_SIZE)
    for (let _x = kx0; _x <= kx1; _x++) {
      for (let _y = ky0; _y <= ky1; _y++) {
        const k = cellKey(_x, _y)
        let _cell = this.cells.get(k)
        if (!_cell) {
          _cell = new Set()
          this.cells.set(k, _cell)
        }
        _cell.add($ξ)
      }
    }
  }

  update($ξ: number, $a: Aabb): void {
    this.remove($ξ)
    this.insert($ξ, $a)
  }

  clear(): void {
    this.cells.clear()
    this.slotAabb.clear()
  }

  queryPoint($p: Vec2): number[] {
    const cx = Math.floor($p[0] / DEFAULT_CELL_SIZE)
    const cy = Math.floor($p[1] / DEFAULT_CELL_SIZE)
    const out: number[] = []
    for (let _dx = -1; _dx <= 1; _dx++) {
      for (let _dy = -1; _dy <= 1; _dy++) {
        const cell = this.cells.get(cellKey(cx + _dx, cy + _dy))
        if (cell) for (const s of cell) out.push(s)
      }
    }
    return out
  }

  // —— 统一命中测试（相机是参数——不做转发）——

  hitTest($m: TsuModel, $camera: CoordMapper, $sx: number, $sy: number): number[] | null {
    const ray = $camera.ray($sx, $sy)
    return ray ? this.hit3D($m, ray) : this.hit2D($m, $camera, $sx, $sy)
  }

  /** 排序 — 光标距离升序再盒面积升序（更小 = 更具体） */
  private rank($m: TsuModel, $hits: number[], $px: number, $py: number): void {
    if ($hits.length < 2) return
    const areas = new Map<number, number>()
    for (const ξ of $hits) {
      const b = boxInto($m, ξ, this.aabbBuf)
      areas.set(ξ, (b[1][0] - b[0][0]) * (b[1][1] - b[0][1]))
    }
    $hits.sort(($a, $b) => {
      const da = cursorDist($m, $a, $px, $py)
      const db = cursorDist($m, $b, $px, $py)
      if (da !== db) return da - db
      return (areas.get($a) ?? 0) - (areas.get($b) ?? 0)
    })
  }

  /**
   * 2D fine test — 粗筛包围盒后走浏览器原生 isPointInPath
   * 一行覆盖任意形状（含贝塞尔 / 圆弧 / 自定义路径）、零类型分支；
   * 未就绪时回退为盒内即命中
   */
  private fine2D($m: TsuModel, $cand: number[], $px: number, $py: number): number[] {
    const hits: number[] = []
    for (const ξ of $cand) {
      if (ξ < 0 || ξ >= $m.count) continue
      const box = boxInto($m, ξ, this.aabbBuf)
      const [min, max] = box
      if ($px < min[0] || $px > max[0] || $py < min[1] || $py > max[1]) continue

      const spec = specOf($m.id[ξ])
      if (spec?.text) { hits.push(ξ); continue }   // 文字按盒命中

      const path = $m.paths[ξ]
      if (!path || !HIT_CTX) { hits.push(ξ); continue }

      // isPointInPath 坐标不受 transform 影响 — 直接在路径局部系中测试
      if (HIT_CTX.isPointInPath(path, $px - $m.x[ξ], $py - $m.y[ξ])) { hits.push(ξ); continue }

      // 子图形（Pen.add 产生）— 同一局部系
      const subs = $m.subs[ξ]
      if (subs) {
        for (const sub of subs) {
          if (sub && HIT_CTX.isPointInPath(sub, $px - $m.x[ξ], $py - $m.y[ξ])) { hits.push(ξ); break }
        }
      }
    }
    return hits
  }

  private hit2D($m: TsuModel, $camera: CoordMapper, $sx: number, $sy: number): number[] | null {
    const p = $camera.at($sx, $sy)
    if (!p) return null
    const cand = this.queryPoint(p)
    const hits = this.fine2D($m, cand, p[0], p[1])

    // 近距兜底 — HIT_TOLERANCE 内取光标距离最小者
    if (hits.length === 0 && cand.length > 0) {
      let _best = -1
      let _bestDist = Infinity
      for (const ξ of cand) {
        if (ξ < 0 || ξ >= $m.count) continue
        const d = cursorDist($m, ξ, p[0], p[1])
        if (d < _bestDist) { _bestDist = d; _best = ξ }
      }
      if (_best >= 0 && _bestDist <= HIT_TOLERANCE * HIT_TOLERANCE) hits.push(_best)
    }

    this.rank($m, hits, p[0], p[1])
    return hits
  }

  private hit3D($m: TsuModel, $ray: Ray3): number[] {
    const halfZ = HALF_EXTRUDE_Z
    const hits: number[] = []
    if ($ray.d[2] === 0) return hits

    // 粗筛 — 射线在挤出板内穿越 z=0 平面
    let _t0 = (-halfZ - $ray.o[2]) / $ray.d[2]
    let _t1 = (halfZ - $ray.o[2]) / $ray.d[2]
    if (_t0 > _t1) { const s = _t0; _t0 = _t1; _t1 = s }
    if (_t1 <= 0) return hits
    const tm = (Math.max(_t0, 0) + _t1) / 2
    const mid: Vec2 = [$ray.o[0] + $ray.d[0] * tm, -($ray.o[1] + $ray.d[1] * tm)]

    for (const ξ of this.queryPoint(mid)) {
      if (ξ < 0 || ξ >= $m.count) continue
      if (ray3Body($m, $ray, ξ)) hits.push(ξ)
    }

    this.rank($m, hits, mid[0], mid[1])
    return hits
  }
}
