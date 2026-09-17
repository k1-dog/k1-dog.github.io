/**
 * camera3 — 3D 相机数学与坐标映射（纯函数 + 无状态映射器）。
 * 空间链：coordXY → world（翻 Y + 挤出 Z）→ clip（裁剪+透视除法）→ screen；
 * screen → pickRay（视线反解射线，命中逆向通道）。
 * 公理：相机是 (内容盒, 画布) 的纯函数，每帧重算无缓存；渲染矩阵与命中射线同出
 * 一个 Camera3 位姿（防双源漂移）；toWorldSpace 是留给 spatial 谓词的唯一共享出口。
 */
import { C3D, HALF_EXTRUDE_Z, ZOOM_MIN, ZOOM_MAX, ORBIT_TURN_STEP, ORBIT_TILT_STEP } from '../helper/const'
import type { TsuModel } from '../m/model'
import type { CoordMapper, Ray3, Vec2, Vec3, Bounds } from '../yomi'

/** 世界系内容盒（min/max 各 3 分量） */
export interface WorldBox { min: Vec3; max: Vec3 }

export interface Camera3 {
  eye: Vec3
  forward: Vec3    // 视线方向（单位向量）
  right: Vec3      // 屏幕右方向（单位向量）
  up: Vec3         // 屏幕上方向（单位向量）
  aspect: number
  tanHalf: number  // tan(有效视锥半角) — "近大远小"的斜率
  near: number     // 近裁剪面（取景派生）
  far: number
}

/** 叉积 a×b（右手系） */
function cross($a: Vec3, $b: Vec3): Vec3 {
  return [
    $a[1] * $b[2] - $a[2] * $b[1],
    $a[2] * $b[0] - $a[0] * $b[2],
    $a[0] * $b[1] - $a[1] * $b[0],
  ]
}

/** 内容盒取景 — 盒 + 画布 + 姿态（tilt/turn/zoom）→ 位姿；包围球 + 有效视锥角保证任意画布入框；dolly = 基准距离 ÷ zoom */
export function frameCamera(
  $box: WorldBox, $w: number, $h: number,
  $tilt: number = C3D.TILT_BASE, $turn: number = C3D.TURN_BASE, $zoom: number = 1,
): Camera3 {
  const aspect = $w / $h
  // 有效视锥角 — 窄画布垂直角按比例收缩（水平撑满），两侧不切
  const fovEff = 2 * Math.atan(Math.tan(C3D.FOV / 2) * Math.min(1, aspect))
  const tanHalf = Math.tan(fovEff / 2)

  // 中心 + 包围球半径（对角线一半 × 余量）
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

  // dist = 整球恰好落入视锥；÷ zoom 实现 dolly（推近/拉远）
  const dist = (R / Math.sin(fovEff / 2)) / $zoom
  // 中心→眼位方向（倾角×侧转球面分解）
  const dir: Vec3 = [
    Math.cos($tilt) * Math.sin($turn),
    Math.sin($tilt),
    Math.cos($tilt) * Math.cos($turn),
  ]
  const eye: Vec3 = [c[0] + dir[0] * dist, c[1] + dir[1] * dist, c[2] + dir[2] * dist]

  // 三轴 — 视线反向；右 = Y×眼向（<90° 永不平行）；上 = 眼向×右
  const forward: Vec3 = [-dir[0], -dir[1], -dir[2]]
  let _right = cross([0, 1, 0], dir)
  const rl = Math.hypot(_right[0], _right[1], _right[2]) || 1
  _right = [_right[0] / rl, _right[1] / rl, _right[2] / rl]
  const up = cross(dir, _right)

  return {
    eye, forward, right: _right, up, aspect, tanHalf,
    near: Math.max(1, dist - R),   // 包围球前后各扩 R — 近面不穿模，远面不裁内容
    far: dist + R,
  }
}

/** 位姿 → 裁剪矩阵（列主序 16 floats → WGSL uniform）：world→clip，GPU 自动裁剪 + 透视除法 ÷w */
const V_BUF = new Float32Array(16)   // 三矩阵复用缓冲（零每帧分配）
const P_BUF = new Float32Array(16)
const M_BUF = new Float32Array(16)

export function clipForTsukiyoWorld($cam: Camera3): Float32Array {
  // 视图矩阵（world→相机系）：旋转 = 三轴，平移 = 眼位搬到原点
  const v = V_BUF
  // 0/1/2 列 = right/up/backward 三轴世界系坐标
  v[0] = $cam.right[0];  v[4] = $cam.right[1];  v[8] = $cam.right[2]
  v[1] = $cam.up[0];     v[5] = $cam.up[1];     v[9] = $cam.up[2]
  v[2] = -$cam.forward[0]; v[6] = -$cam.forward[1]; v[10] = -$cam.forward[2]
  // 第 3 列 = -轴·眼位（先减眼位再投影三轴）
  v[12] = -($cam.right[0] * $cam.eye[0] + $cam.right[1] * $cam.eye[1] + $cam.right[2] * $cam.eye[2])
  v[13] = -($cam.up[0] * $cam.eye[0] + $cam.up[1] * $cam.eye[1] + $cam.up[2] * $cam.eye[2])
  v[14] = ($cam.forward[0] * $cam.eye[0] + $cam.forward[1] * $cam.eye[1] + $cam.forward[2] * $cam.eye[2])
  v[15] = 1   // 仿射齐次项 — 漏写则透视 z 行失去 V 平移乘子，NDC z 恒 >1 → 全部几何越远裁剪面（3D 空白）

  // 透视矩阵（相机系→clip）：WebGPU 右手系，NDC z∈[0,1]
  const p = P_BUF
  const f = 1 / $cam.tanHalf
  p[0] = f / $cam.aspect  // x 压缩（宽画布水平视角更宽）
  p[5] = f                // y 缩放（半角越小越"长焦"放大越多）
  p[10] = $cam.far / ($cam.near - $cam.far)  // z: [near,far]→[0,1]（非线性，近处精度高）
  p[11] = -1              // w = -z_view — 前方可见；"近大远小"正源于此
  p[14] = ($cam.near * $cam.far) / ($cam.near - $cam.far)

  // clip = 透视 × 视图
  const m = M_BUF
  for (let _c = 0; _c < 4; _c++) {
    for (let _r = 0; _r < 4; _r++) {
      m[_c * 4 + _r] =
        p[_r] * v[_c * 4] + p[4 + _r] * v[_c * 4 + 1] +
        p[8 + _r] * v[_c * 4 + 2] + p[12 + _r] * v[_c * 4 + 3]
    }
  }
  return m
}

/** 屏幕像素 → 视线射线：NDC → forward + right/up×tanHalf 屏面偏移（与透视矩阵 p[0]/p[5] 严格互逆） */
function sightRay(
  $cam: Camera3, $w: number, $h: number, $sx: number, $sy: number,
): Ray3 | null {
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

/** 图表 AABB → 世界盒 — 翻 Y + ±挤出半厚（spatial 谓词消费） */
export function toWorldSpace($box: Bounds, $halfZ: number): WorldBox {
  return {
    min: [$box[0][0], -$box[1][1], -$halfZ],
    max: [$box[1][0], -$box[0][1], $halfZ],
  }
}

// —— CoordMapper 双实现（工厂成对创建防漂移）——

/** CoordMapper2D — 2D 视线仿射（zoom + gaze 唯一持有者） */
export class CoordMapper2D implements CoordMapper {
  readonly is3D = false

  // 视线状态唯一持有：zoom + gaze 偏移（CSS px）
  private zoom = 1
  private gazeX = 0
  private gazeY = 0
  private viewW = 0
  private viewH = 0

  private gazeM = new Float32Array(6)   // [z,0,0,z,gx,gy] 复用零分配
  private moved = false                 // 取景变化标志（frame 消费即清）

  get clipMatrix(): Float32Array | null { return this.gazeM }

  get sight(): Vec3 | null { return null }   // 2D 无相机光轴

  // 推近/拉远 — 跟手锚点缩放：锚点钉住不动，g' = a - (a-g)·(z'/z)
  zoomBy($delta: number, $ax?: number, $ay?: number): void {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * Math.exp($delta)))
    if (next === this.zoom) return
    const ax = $ax ?? this.viewW / 2
    const ay = $ay ?? this.viewH / 2
    const ratio = next / this.zoom
    this.gazeX = ax - (ax - this.gazeX) * ratio
    this.gazeY = ay - (ay - this.gazeY) * ratio
    this.zoom = next
    this.moved = true
  }

  // 视线平移（拖拽 1:1 跟手）
  orbitBy($dx: number, $dy: number): void {
    if ($dx === 0 && $dy === 0) return
    this.gazeX += $dx
    this.gazeY += $dy
    this.moved = true
  }

  // 取景 — 重算六元仿射；true = 取景变了
  frame($m: TsuModel, $w: number, $h: number): boolean {
    this.viewW = $w
    this.viewH = $h
    const b = $m.contentBounds()
    if (!b) { this.gazeM.fill(0); this.gazeM[0] = this.gazeM[3] = 1; return false }
    // 中点随 zoom/gaze 平移（锚点 = 当前凝视点）
    this.gazeM[0] = this.zoom;  this.gazeM[1] = 0
    this.gazeM[2] = 0;          this.gazeM[3] = this.zoom
    this.gazeM[4] = this.gazeX; this.gazeM[5] = this.gazeY
    const moved = this.moved
    this.moved = false
    return moved
  }

  // 点拾取 — 逆仿射换算（与 gazeM 严格互逆）
  worldToCoordXY($sx: number, $sy: number): Vec2 | null {
    if (this.zoom === 0) return null
    return [($sx - this.gazeX) / this.zoom, ($sy - this.gazeY) / this.zoom]
  }

  pickRay($_$sx: number, $_$sy: number): Ray3 | null {
    return null   // 2D 点拾取即足够
  }

  // AABB 正仿射到屏幕域后完全出屏判定
  outOfSight($bounds: Bounds, $w: number, $h: number): boolean {
    const [min, max] = $bounds
    const sx0 = min[0] * this.zoom + this.gazeX
    const sy0 = min[1] * this.zoom + this.gazeY
    const sx1 = max[0] * this.zoom + this.gazeX
    const sy1 = max[1] * this.zoom + this.gazeY
    return sx1 < 0 || sx0 > $w || sy1 < 0 || sy0 > $h
  }
}

/** CoordMapper3D — 相机映射（渲染与命中同源） */
export class CoordMapper3D implements CoordMapper {
  readonly is3D = true
  private camera: Camera3 | null = null
  private matrix: Float32Array | null = null
  private viewW = 0
  private viewH = 0

  // 视线姿态唯一持有：tilt + turn + zoom
  private tilt: number = C3D.TILT_BASE
  private turn: number = C3D.TURN_BASE
  private zoom = 1
  private moved = false

  get clipMatrix(): Float32Array | null { return this.matrix }

  get sight(): Vec3 | null { return this.camera ? this.camera.forward : null }  // 同源

  // dolly 推拉（基准距离 ÷ zoom）
  zoomBy($delta: number): void {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * Math.exp($delta)))
    if (next !== this.zoom) { this.zoom = next; this.moved = true }
  }

  // 自由旋转 — turn + tilt（tilt 钳制避开 ±90° 退化）
  orbitBy($dx: number, $dy: number): void {
    if ($dx === 0 && $dy === 0) return
    this.turn += - $dx * ORBIT_TURN_STEP
    this.tilt = Math.min(C3D.TILT_MAX, Math.max(C3D.TILT_MIN, this.tilt + $dy * ORBIT_TILT_STEP))
    this.moved = true
  }

  // 取景 — ① contentBounds（hover/anim 不改写 → 不呼吸）→ 世界盒 ② frameCamera ③ 矩阵
  frame($m: TsuModel, $w: number, $h: number): boolean {
    this.viewW = $w
    this.viewH = $h
    const b = $m.contentBounds()
    if (!b) {                          // 空模型
      this.camera = null
      this.matrix = null
      return false
    }
    const box: WorldBox = toWorldSpace(b, HALF_EXTRUDE_Z)

    this.camera = frameCamera(box, $w, $h, this.tilt, this.turn, this.zoom)
    this.matrix = clipForTsukiyoWorld(this.camera)
    const moved = this.moved
    this.moved = false
    return moved
  }

  // 点拾取恒空 — 挤出体 z=0 平面交点系统性偏移，3D 必须走 pickRay
  worldToCoordXY($_$sx: number, $_$sy: number): Vec2 | null {
    return null
  }

  // 射线拾取 — 与渲染矩阵同一 Camera3 位姿（同源）
  pickRay($sx: number, $sy: number): Ray3 | null {
    if (!this.camera) return null
    return sightRay(this.camera, this.viewW, this.viewH, $sx, $sy)
  }

  // 恒 false 保守放行（真剔除由 GPU 裁剪面完成）
  outOfSight($_$bounds: Bounds, $_$w: number, $_$h: number): boolean {
    return false
  }
}
