/**
 * camera3 — 3D 相机数学与坐标映射（纯函数 + 无状态映射器）
 *
 * 空间链（全系统唯一闭环，命名即语义）:
 *   coordXY（图表平面 — coord/paths 写入 SoA 的 x/y，命中管线的工作空间）
 *     → rectToWorld / lineToWorld / sectorToWorld（翻 Y · 挤出 Z，render-3d 内）
 *   → world（3D 场景系: worldY = -screenY, worldZ = ±挤出厚度/2）
 *     → clipForTsukiyoWorld（裁剪 + 透视除法）
 *   → screen（屏幕上最终呈现的月读世界）
 *   screen → pickRay（视线反解成射线 — 命中测试的逆向通道）
 *
 * 设计公理: 相机是 (内容盒, 画布尺寸) 的纯函数 — 每帧无条件重算，无缓存无失效链路；
 *   渲染矩阵与命中射线出自同一 Camera3 位姿，结构性杜绝双源漂移。
 *   CoordMapper2D 恒等直返 — 2D 下屏幕像素即图表坐标。
 *
 * 命中谓词: 挤出体射线相交测试（ray* 族 · 凸域相交统一"t 区间收窄"）已收敛至
 *   spatial 命中区 — 与 render-3d packer 共享"SoA 2D 位面 + 翻 Y + ±挤出半厚"
 *   的同一几何公理（真三维测试的 rationale 见 spatial 命中区）。
 *   toWorldSpace（图表 AABB → 世界盒）是本文件留给 spatial 谓词的唯一共享出口。
 */
import { C3D, HALF_EXTRUDE_Z, ZOOM_MIN, ZOOM_MAX, ORBIT_TURN_STEP, ORBIT_TILT_STEP } from '../helper/const'
import type { TsuModel } from '../m/model'
import type { CoordMapper, Ray3, Vec2, Vec3, Bounds } from '../yomi'

/** 世界系内容盒（min/max 各 3 分量） */
export interface WorldBox { min: Vec3; max: Vec3 }

/** Camera3 — 相机位姿快照（矩阵与命中射线的共同来源） */
export interface Camera3 {
  eye: Vec3        // 相机眼位（世界系）
  forward: Vec3    // 视线方向（单位向量，眼位→内容中心）
  right: Vec3      // 屏幕右方向（单位向量）
  up: Vec3         // 屏幕上方向（单位向量）
  aspect: number   // 画布宽高比
  tanHalf: number  // tan(有效视锥半角) — "近大远小"的斜率
  near: number     // 近裁剪面距离（取景派生，不设常量）
  far: number      // 远裁剪面距离
}

/** 叉积 a×b（右手系） */
function cross($a: Vec3, $b: Vec3): Vec3 {
  return [
    $a[1] * $b[2] - $a[2] * $b[1],
    $a[2] * $b[0] - $a[0] * $b[2],
    $a[0] * $b[1] - $a[1] * $b[0],
  ]
}

/**
 * 内容盒取景 — 内容盒 + 画布 + 视线姿态（tilt 倾角 / turn 侧转 / zoom 推拉）→ 相机位姿
 * 包围球 + 有效视锥角（窄高画布取竖直/水平较小者）保证任意画布形状内容完整入框
 * zoom 以除法实现 dolly 推拉 — 基准距离 ÷ zoom，推近（zoom>1）后退远（zoom<1）语义与 2D 缩放一致
 */
export function frameCamera(
  $box: WorldBox, $w: number, $h: number,
  $tilt: number = C3D.TILT_BASE, $turn: number = C3D.TURN_BASE, $zoom: number = 1,
): Camera3 {
  const aspect = $w / $h
  // 有效视锥角 — 画布越窄，垂直角按比例收缩（水平角撑满），内容两侧不被切掉
  const fovEff = 2 * Math.atan(Math.tan(C3D.FOV / 2) * Math.min(1, aspect))
  const tanHalf = Math.tan(fovEff / 2)

  // 内容中心 + 包围球半径（盒对角线一半 × 余量系数）
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

  // 相机驻点 — 沿"俯角绕 X、偏航绕 Y"的方向退 dist 距离，恰好整球落入视锥
  // zoom 推拉 = 基准距离按 zoom 缩放（推近看细节 / 拉远看全景）
  const dist = (R / Math.sin(fovEff / 2)) / $zoom
  // 中心→眼位 方向（单位向量: 倾角×侧转的标准球面分解）
  const dir: Vec3 = [
    Math.cos($tilt) * Math.sin($turn),
    Math.sin($tilt),
    Math.cos($tilt) * Math.cos($turn),
  ]
  const eye: Vec3 = [c[0] + dir[0] * dist, c[1] + dir[1] * dist, c[2] + dir[2] * dist]

  // 相机三轴 — 视线 = 反向；右 = 世界Y轴 × 眼向（俯角 <90° 永不平行）；上 = 眼向 × 右
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

/**
 * 位姿 → 裁剪矩阵（列主序 16 floats，直接写入 WGSL uniform）
 *
 * 语义: world → clip。GPU 拿到 clip 坐标后自动做两件事 —
 *   ① 裁剪: x/y/z 超出 [-w,w]×[-w,w]×[0,w] 的三角形被切掉
 *   ② 透视除法: ÷w（w = -z_view，离相机越远 w 越大 → 屏幕上越小）
 * 两者合成"世界终于变成屏幕上的月读世界" — 故名 clipForTsukiyoWorld。
 */
/** 三矩阵复用缓冲 — clipForTsukiyoWorld 每帧覆写（零每帧分配） */
const V_BUF = new Float32Array(16)
const P_BUF = new Float32Array(16)
const M_BUF = new Float32Array(16)

export function clipForTsukiyoWorld($cam: Camera3): Float32Array {
  // —— 视图矩阵（world → 相机系）: 旋转 = 相机三轴，平移 = 把眼位搬到原点 ——
  const v = V_BUF
  // 第 0/1/2 列 = right/up/backward 三轴在世界系的坐标（backward = -forward）
  v[0] = $cam.right[0];  v[4] = $cam.right[1];  v[8] = $cam.right[2]
  v[1] = $cam.up[0];     v[5] = $cam.up[1];     v[9] = $cam.up[2]
  v[2] = -$cam.forward[0]; v[6] = -$cam.forward[1]; v[10] = -$cam.forward[2]
  // 第 3 列 = -轴·眼位（平移: 世界点先减去眼位再投影到三轴）
  v[12] = -($cam.right[0] * $cam.eye[0] + $cam.right[1] * $cam.eye[1] + $cam.right[2] * $cam.eye[2])
  v[13] = -($cam.up[0] * $cam.eye[0] + $cam.up[1] * $cam.eye[1] + $cam.up[2] * $cam.eye[2])
  v[14] = ($cam.forward[0] * $cam.eye[0] + $cam.forward[1] * $cam.eye[1] + $cam.forward[2] * $cam.eye[2])
  v[15] = 1   // 仿射齐次项 — 漏写则透视 z 行失去 V 平移乘子，NDC z 恒 >1 → 全部几何越远裁剪面（3D 空白）

  // —— 透视矩阵（相机系 → clip）: WebGPU 右手系，NDC z∈[0,1] ——
  const p = P_BUF
  const f = 1 / $cam.tanHalf
  p[0] = f / $cam.aspect  // x 缩放 — 宽画布上水平视角更宽，x 压缩补偿
  p[5] = f                // y 缩放 — 视锥半角越小(相机越"长焦")，放大越多
  p[10] = $cam.far / ($cam.near - $cam.far)  // z 重映射: [near,far] → [0,1]（非线性，近处精度高）
  p[11] = -1              // w = -z_view — 前方(w>0)才可见；透视除法的"近大远小"正源于此
  p[14] = ($cam.near * $cam.far) / ($cam.near - $cam.far)

  // —— 合成 clip = 透视 × 视图（先搬运到相机系，再裁剪+除法）——
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

/**
 * 屏幕像素 → 世界系视线射线（pickRay 的几何核心）
 * NDC → 视线方向 = forward + 屏面偏移（right/up × tanHalf 斜率）
 * 与透视矩阵 p[0]=f/aspect、p[5]=f 严格互逆 — 同一相机的正/逆两条路
 */
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

/** 图表 AABB（SoA 坐标）→ 世界盒 — Y 翻转 + ±挤出半厚（与 packer 同一几何公理；spatial 命中区谓词消费） */
export function toWorldSpace($box: Bounds, $halfZ: number): WorldBox {
  return {
    min: [$box[0][0], -$box[1][1], -$halfZ],
    max: [$box[1][0], -$box[0][1], $halfZ],
  }
}

// —— CoordMapper 双实现 — Renderer 后端与坐标映射在工厂成对创建，结构性防漂移 ——

/** CoordMapper2D — 视线仿射映射（2D 视线状态唯一持有者：zoom 推拉 + gaze 平移） */
export class CoordMapper2D implements CoordMapper {
  readonly is3D = false

  /** 视线状态 — 本类唯一持有：缩放因子 + 凝视点偏移（CSS px） */
  private zoom = 1
  private gazeX = 0
  private gazeY = 0
  /** 画布尺寸 — frame() 持续更新（缩放缺省锚点 = 画布中心） */
  private viewW = 0
  private viewH = 0

  /** 六元视线仿射 buffer [a,b,c,d,e,f] = [z,0,0,z,gx,gy] — 复用零分配 */
  private gazeM = new Float32Array(6)
  /** 取景变化标志 — frame() 消费即清（内容盒/画布/视线任一变化的单一信号） */
  private moved = false

  get clipMatrix(): Float32Array | null { return this.gazeM }

  /** 2D 无相机光轴 — 视线恒空（sight 是 3D 相机概念） */
  get sight(): Vec3 | null { return null }

  /** 视线推近/拉远 — 跟手锚点缩放：锚点（缺省画布中心）钉住不动，g' = a - (a-g)·(z'/z) */
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

  /** 视线平移 — 拖拽跟手 1:1（dx/dy 即 CSS px 增量） */
  orbitBy($dx: number, $dy: number): void {
    if ($dx === 0 && $dy === 0) return
    this.gazeX += $dx
    this.gazeY += $dy
    this.moved = true
  }

  /** 取景 — 内容盒/画布任一变化时重算六元仿射；返回 true = 取景变了（moved 信号） */
  frame($m: TsuModel, $w: number, $h: number): boolean {
    this.viewW = $w
    this.viewH = $h
    const b = $m.contentBounds()
    if (!b) { this.gazeM.fill(0); this.gazeM[0] = this.gazeM[3] = 1; return false }
    // 2D 取景：内容盒中点随 zoom 推拉/视线平移平移（缩放锚点 = 当前凝视点）
    this.gazeM[0] = this.zoom;  this.gazeM[1] = 0
    this.gazeM[2] = 0;          this.gazeM[3] = this.zoom
    this.gazeM[4] = this.gazeX; this.gazeM[5] = this.gazeY
    const moved = this.moved
    this.moved = false
    return moved
  }

  /** 点拾取流 — 逆仿射换算（与 gazeM 正变换严格互逆，渲染与命中同源） */
  worldToCoordXY($sx: number, $sy: number): Vec2 | null {
    if (this.zoom === 0) return null
    return [($sx - this.gazeX) / this.zoom, ($sy - this.gazeY) / this.zoom]
  }

  /** 2D 无相机 — 射线拾取流恒空（点拾取即足够） */
  pickRay($_$sx: number, $_$sy: number): Ray3 | null {
    return null
  }

  /** 视线之外 — AABB 经正仿射换算到屏幕域后完全出屏判定（pan/zoom 后回视口的元素正确恢复） */
  outOfSight($bounds: Bounds, $w: number, $h: number): boolean {
    const [min, max] = $bounds
    const sx0 = min[0] * this.zoom + this.gazeX
    const sy0 = min[1] * this.zoom + this.gazeY
    const sx1 = max[0] * this.zoom + this.gazeX
    const sy1 = max[1] * this.zoom + this.gazeY
    return sx1 < 0 || sx0 > $w || sy1 < 0 || sy0 > $h
  }
}

/** CoordMapper3D — 相机映射（聚合内容盒 → 取景 → 矩阵/射线，渲染与命中同源） */
export class CoordMapper3D implements CoordMapper {
  readonly is3D = true
  private camera: Camera3 | null = null
  private matrix: Float32Array | null = null
  private viewW = 0
  private viewH = 0

  /** 视线姿态 — 本类唯一持有：倾角（正=俯瞰楼宇天台 / 负=仰望楼底）+ 侧转角 + 推拉因子 */
  private tilt: number = C3D.TILT_BASE
  private turn: number = C3D.TURN_BASE
  private zoom = 1
  /** 取景变化标志 — frame() 消费即清 */
  private moved = false

  get clipMatrix(): Float32Array | null { return this.matrix }

  /** 本帧视线（相机光轴）— 与 clipMatrix 同一次取景产出（渲染与命中同源） */
  get sight(): Vec3 | null { return this.camera ? this.camera.forward : null }

  /** 视线推近/拉远 — dolly 推拉（基准取景距离 ÷ zoom） */
  zoomBy($delta: number): void {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * Math.exp($delta)))
    if (next !== this.zoom) { this.zoom = next; this.moved = true }
  }

  /** 视线绕场景自由旋转 — 水平偏航 turn + 垂直俯仰 tilt（拖拽跟手；tilt 钳制避开 ±90° 三轴退化） */
  orbitBy($dx: number, $dy: number): void {
    if ($dx === 0 && $dy === 0) return
    this.turn += - $dx * ORBIT_TURN_STEP
    this.tilt = Math.min(C3D.TILT_MAX, Math.max(C3D.TILT_MIN, this.tilt + $dy * ORBIT_TILT_STEP))
    this.moved = true
  }

  /**
   * 取景（layering 每帧调用）— 三步:
   *   ① 聚合内容盒: model.contentBounds（图表系总边界单源实现）→ 翻 Y + ±挤出厚度 → 世界系
   *      （contentBounds 是目标几何 — hover/anim 不改写 SoA，取景稳定不呼吸）
   *   ② frameCamera 取景（携带 tilt/turn/zoom 视线姿态）→ 位姿
   *   ③ clipForTsukiyoWorld → 矩阵
   *   返回 true = 取景变了（视线交互后触发网格/基准重建）
   */
  frame($m: TsuModel, $w: number, $h: number): boolean {
    this.viewW = $w
    this.viewH = $h
    // ① 聚合 — contentBounds 单源实现，再一次翻 Y 成世界盒（min/max 严格对应）
    const b = $m.contentBounds()
    if (!b) {                          // 空模型 — 无内容可取景
      this.camera = null
      this.matrix = null
      return false
    }
    const box: WorldBox = toWorldSpace(b, HALF_EXTRUDE_Z)

    // ②③ 取景（携带 tilt/turn/zoom 视线姿态）+ 矩阵
    this.camera = frameCamera(box, $w, $h, this.tilt, this.turn, this.zoom)
    this.matrix = clipForTsukiyoWorld(this.camera)
    const moved = this.moved
    this.moved = false
    return moved
  }

  /**
   * 点拾取流恒空 — 挤出体高出基平面，z=0 平面交点会系统性偏移（见文件头），
   * 3D 命中必须走 pickRay 射线流
   */
  worldToCoordXY($_$sx: number, $_$sy: number): Vec2 | null {
    return null
  }

  /** 射线拾取流 — 相机就绪即返回本帧视线（渲染矩阵同一 Camera3 位姿，同源） */
  pickRay($sx: number, $sy: number): Ray3 | null {
    if (!this.camera) return null
    return sightRay(this.camera, this.viewW, this.viewH, $sx, $sy)
  }

  /** 视线之外 — 3D 视锥剔除的近似语义：恒 false（保守放行，宁可多绘不漏绘；真剔除由 GPU 裁剪面完成） */
  outOfSight($_$bounds: Bounds, $_$w: number, $_$h: number): boolean {
    return false
  }
}
