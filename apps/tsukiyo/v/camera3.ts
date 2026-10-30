/**
 * v/camera3 — 相机契约实现；相机是（内容区、画布、位姿）的纯函数：
 * 取景每帧重算零缓存；渲染矩阵与命中射线出自同一位姿（零漂移）
 */
import { C3D, HALF_EXTRUDE_Z, ZOOM_MIN, ZOOM_MAX, ORBIT_TURN_STEP, ORBIT_TILT_STEP } from '../helper/const'
import type { CoordMapper, Ray3, Vec2, Vec3, Aabb, View } from '../yomi'

export interface WorldBox { min: Vec3; max: Vec3 }

export interface Camera3 {
  eye: Vec3
  forward: Vec3
  right: Vec3
  up: Vec3
  aspect: number
  tanHalf: number
  near: number
  far: number
}

function cross($a: Vec3, $b: Vec3): Vec3 {
  return [
    $a[1] * $b[2] - $a[2] * $b[1],
    $a[2] * $b[0] - $a[0] * $b[2],
    $a[0] * $b[1] - $a[1] * $b[0],
  ]
}

/** 取景内容盒 — 包围球 + 有效 FOV；推拉 = 基距 ÷ zoom */
export function frameCamera(
  $box: WorldBox, $w: number, $h: number,
  $tilt: number = C3D.TILT_BASE, $turn: number = C3D.TURN_BASE, $zoom: number = 1,
): Camera3 {
  const aspect = $w / $h
  const fov = 2 * Math.atan(Math.tan(C3D.FOV / 2) * Math.min(1, aspect))
  const tanHalf = Math.tan(fov / 2)

  const c: Vec3 = [
    ($box.min[0] + $box.max[0]) / 2,
    ($box.min[1] + $box.max[1]) / 2,
    ($box.min[2] + $box.max[2]) / 2,
  ]
  const R = 0.5 * Math.hypot(
    $box.max[0] - $box.min[0],
    $box.max[1] - $box.min[1],
    $box.max[2] - $box.min[2],
  ) * C3D.FIT_MARGIN

  const dist = (R / Math.sin(fov / 2)) / $zoom
  const dir: Vec3 = [
    Math.cos($tilt) * Math.sin($turn),
    Math.sin($tilt),
    Math.cos($tilt) * Math.cos($turn),
  ]
  const eye: Vec3 = [c[0] + dir[0] * dist, c[1] + dir[1] * dist, c[2] + dir[2] * dist]

  const forward: Vec3 = [-dir[0], -dir[1], -dir[2]]
  let _right = cross([0, 1, 0], dir)
  const rl = Math.hypot(_right[0], _right[1], _right[2]) || 1
  _right = [_right[0] / rl, _right[1] / rl, _right[2] / rl]

  return {
    eye, forward, right: _right, up: cross(dir, _right), aspect, tanHalf,
    near: Math.max(1, dist - R),
    far: dist + R,
  }
}

/** 位姿 → 裁剪矩阵（列主序 16 浮点）：world → clip */
const V = new Float32Array(16)
const P = new Float32Array(16)
const M = new Float32Array(16)

export function clipForTsukiyoWorld($cam: Camera3): Float32Array {
  const v = V
  v[0] = $cam.right[0];  v[4] = $cam.right[1];  v[8] = $cam.right[2]
  v[1] = $cam.up[0];     v[5] = $cam.up[1];     v[9] = $cam.up[2]
  v[2] = -$cam.forward[0]; v[6] = -$cam.forward[1]; v[10] = -$cam.forward[2]
  v[12] = -($cam.right[0] * $cam.eye[0] + $cam.right[1] * $cam.eye[1] + $cam.right[2] * $cam.eye[2])
  v[13] = -($cam.up[0] * $cam.eye[0] + $cam.up[1] * $cam.eye[1] + $cam.up[2] * $cam.eye[2])
  v[14] = ($cam.forward[0] * $cam.eye[0] + $cam.forward[1] * $cam.eye[1] + $cam.forward[2] * $cam.eye[2])
  v[15] = 1

  const p = P
  const f = 1 / $cam.tanHalf
  p[0] = f / $cam.aspect
  p[5] = f
  p[10] = $cam.far / ($cam.near - $cam.far)
  p[11] = -1
  p[14] = ($cam.near * $cam.far) / ($cam.near - $cam.far)

  const m = M
  for (let _c = 0; _c < 4; _c++) {
    for (let _r = 0; _r < 4; _r++) {
      m[_c * 4 + _r] =
        p[_r] * v[_c * 4] + p[4 + _r] * v[_c * 4 + 1] +
        p[8 + _r] * v[_c * 4 + 2] + p[12 + _r] * v[_c * 4 + 3]
    }
  }
  return m
}

/** 屏幕像素 → 世界射线（上式投影的严格逆） */
function sightRay($cam: Camera3, $w: number, $h: number, $sx: number, $sy: number): Ray3 | null {
  if ($w === 0 || $h === 0) return null
  const ndcX = (2 * $sx) / $w - 1
  const ndcY = 1 - (2 * $sy) / $h
  const kx = ndcX * $cam.tanHalf * $cam.aspect
  const ky = ndcY * $cam.tanHalf
  return {
    o: [$cam.eye[0], $cam.eye[1], $cam.eye[2]],
    d: [
      $cam.forward[0] + $cam.right[0] * kx + $cam.up[0] * ky,
      $cam.forward[1] + $cam.right[1] * kx + $cam.up[1] * ky,
      $cam.forward[2] + $cam.right[2] * kx + $cam.up[2] * ky,
    ],
  }
}

/** 图表区 → 世界盒 — 翻转 Y + 挤出半厚 */
export function toWorldSpace($box: Aabb, $halfZ: number): WorldBox {
  return {
    min: [$box[0][0], -$box[1][1], -$halfZ],
    max: [$box[1][0], -$box[0][1], $halfZ],
  }
}

// —— 实现 ——

const AFFINE = new Float32Array(6)

/** 2D — 视口仿射（zoom + gaze）的唯一持有者 */
export class CoordMapper2D implements CoordMapper {
  readonly is3D = false
  readonly view: View = { m: AFFINE, sight: null, area: null }

  private z = 1
  private gx = 0
  private gy = 0
  private vw = 0
  private vh = 0
  private z0 = 0
  private moved = false

  private write(): void {
    AFFINE[0] = this.z; AFFINE[1] = 0
    AFFINE[2] = 0; AFFINE[3] = this.z
    AFFINE[4] = this.gx; AFFINE[5] = this.gy
  }

  frame($area: Aabb | null, $w: number, $h: number, $initZoom?: number): boolean {
    const resized = $w !== this.vw || $h !== this.vh
    this.vw = $w
    this.vh = $h
    this.view.area = $area

    // 初始 zoom — 视口存活时经滚轮路径吸收一次
    if ($initZoom !== undefined && this.z0 === 0 && $initZoom > 0 && $w > 0 && $h > 0) {
      this.z0 = $initZoom
      this.zoom(Math.log($initZoom), $w / 2, $h / 2)
    }

    this.write()
    const moved = this.moved || resized
    this.moved = false
    return moved
  }

  zoom($Δ: number, $ax?: number, $ay?: number): void {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.z * Math.exp($Δ)))
    if (next === this.z) return
    const ax = $ax ?? this.vw / 2
    const ay = $ay ?? this.vh / 2
    const ratio = next / this.z
    this.gx = ax - (ax - this.gx) * ratio
    this.gy = ay - (ay - this.gy) * ratio
    this.z = next
    this.moved = true
    this.write()
  }

  orbit($dx: number, $dy: number): void {
    if ($dx === 0 && $dy === 0) return
    this.gx += $dx
    this.gy += $dy
    this.moved = true
    this.write()
  }

  at($sx: number, $sy: number): Vec2 | null {
    if (this.z === 0) return null
    return [($sx - this.gx) / this.z, ($sy - this.gy) / this.z]
  }

  ray($_sx: number, $_sy: number): Ray3 | null {
    return null
  }

  culled($area: Aabb, $w: number, $h: number): boolean {
    const [min, max] = $area
    const x1 = max[0] * this.z + this.gx
    const x0 = min[0] * this.z + this.gx
    const y1 = max[1] * this.z + this.gy
    const y0 = min[1] * this.z + this.gy
    return x1 < 0 || x0 > $w || y1 < 0 || y0 > $h
  }
}

/** 3D — 位姿持有者（tilt / turn / zoom） */
export class CoordMapper3D implements CoordMapper {
  readonly is3D = true
  readonly view: View = { m: null, sight: null, area: null }

  private cam: Camera3 | null = null
  private vw = 0
  private vh = 0
  private tilt: number = C3D.TILT_BASE
  private turn: number = C3D.TURN_BASE
  private z = 1
  private z0 = 0
  private moved = false

  frame($area: Aabb | null, $w: number, $h: number, $initZoom?: number): boolean {
    const resized = $w !== this.vw || $h !== this.vh
    this.vw = $w
    this.vh = $h
    this.view.area = $area

    if ($initZoom !== undefined && this.z0 === 0 && $initZoom > 0 && $w > 0 && $h > 0) {
      this.z0 = $initZoom
      this.z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.z * $initZoom))
    }

    if (!$area || $w === 0 || $h === 0) {
      this.cam = null
      this.view.m = null
      this.view.sight = null
      this.moved = false
      return false
    }

    const cam = frameCamera(toWorldSpace($area, HALF_EXTRUDE_Z), $w, $h, this.tilt, this.turn, this.z)
    this.cam = cam
    this.view.m = clipForTsukiyoWorld(cam)
    this.view.sight = cam.forward
    const moved = this.moved || resized
    this.moved = false
    return moved
  }

  zoom($Δ: number): void {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.z * Math.exp($Δ)))
    if (next !== this.z) { this.z = next; this.moved = true }
  }

  orbit($dx: number, $dy: number): void {
    if ($dx === 0 && $dy === 0) return
    this.turn += -$dx * ORBIT_TURN_STEP
    this.tilt = Math.min(C3D.TILT_MAX, Math.max(C3D.TILT_MIN, this.tilt + $dy * ORBIT_TILT_STEP))
    this.moved = true
  }

  at($_sx: number, $_sy: number): Vec2 | null {
    return null
  }

  ray($sx: number, $sy: number): Ray3 | null {
    if (!this.cam) return null
    return sightRay(this.cam, this.vw, this.vh, $sx, $sy)
  }

  culled($_area: Aabb, $_w: number, $_h: number): boolean {
    return false
  }
}
