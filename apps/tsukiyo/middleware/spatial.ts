/**
 * spatial — 数据空间模块（三区治理）
 *
 * 划分区（空间哈希网格 · broad phase 粗筛）:
 *   单位按位置落入网格 cell，移动时从旧 cell 移除、加入新 cell（O(1)）
 *   碰撞查询只检查目标 cell + 邻域 cell（3×3）
 *   只存 slot（数字），不存坐标副本。命中后用 slot 回 SoA 取数据
 *   更新: 脏驱动增量 — layering 只喂脏元素
 *
 * cell key — 数字位打包（零字符串分配）:
 *   key = (cx + CELL_KEY_OFFSET) * CELL_KEY_STRIDE + (cy + CELL_KEY_OFFSET)
 *   覆盖 ±32768 cell（DEFAULT_CELL_SIZE=64 下即 ±2M CSS px），画布物理上不可越界
 *
 * 聚合区（取景相机 · 空间换算）:
 *   "全部内容的总边界在哪" — camera（CoordMapper 策略注入，2D 视线仿射 / 3D 相机，
 *   与渲染后端在工厂成对创建）聚合 model.contentBounds → 取景 → 矩阵
 *   提供 屏幕像素 → 图表坐标（2D 点换算）/ 屏幕像素 → 世界射线（3D 视线射线）的换算
 *   与本帧渲染矩阵/视线（draw 消费）；渲染与命中同源（结构性防漂移）
 *   更新: 每帧无条件重算 — 纯函数无缓存，结构性杜绝过期/漂移
 *
 * 命中区（碰撞检测 · narrow phase 精筛）:
 *   onHitTest 统一入口 — 内部自选：3D 视线射线就绪走射线流，否则走点流
 *   hitByRay（3D）: z 板夹取 → 划分区候选 → rayBody 逐槽位精测
 *   hitByPoint（2D）: 视线反解 → 划分区候选 → 内联精测（AABB/Arc 角度/Triangle 重心）
 *   纯读检测 — model 逐调用传入，零 SoA 写入零缓存（命中数据单出口）
 *   ray* 谓词族（模块级纯函数）— 凸域相交统一"t 区间收窄"，几何参数逐字镜像 render-3d packer 锚点语义
 *   挤出体走真三维测试 — z=0 平面交点在俯角下系统性后移 ~halfZ·tan(pitch)，矮柱/邻扇会被漏检/错检
 *
 * 三区数据形态互不读取: 划分 = 多格索引（哪里有什么），聚合 = 单一内容盒（世界长什么样），
 * 命中 = 纯读检测（哪里被点中 — 只借索引与相机，不产状态）
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

// cell key 位打包常量（±32768 cell 覆盖范围）
const CELL_KEY_OFFSET = 0x8000
const CELL_KEY_STRIDE = 0x10000

/** cell 坐标 → 数字 key（零分配） */
function cellKey($cx: number, $cy: number): number {
  return ($cx + CELL_KEY_OFFSET) * CELL_KEY_STRIDE + ($cy + CELL_KEY_OFFSET)
}

// —— 射线谓词 — 凸域相交统一为"t 区间收窄"（初始 [0,+∞)，任一条件收空即未命中）——

/** t 区间 — 各谓词共用的收窄载体 */
interface RaySpan { lo: number; hi: number }

/**
 * 单轴 slab — o+td 落入 [lo,hi] 的 t 区间收窄到 $span（永久改写）
 * 轴平行（d=0）时退化为原点包含测试
 */
function slab($o: number, $d: number, $lo: number, $hi: number, $span: RaySpan): boolean {
  if ($d === 0) return $o >= $lo && $o <= $hi
  let _a = ($lo - $o) / $d
  let _b = ($hi - $o) / $d
  if (_a > _b) { const s = _a; _a = _b; _b = s }
  if (_a > $span.lo) $span.lo = _a
  if (_b < $span.hi) $span.hi = _b
  return $span.lo <= $span.hi
}

/** 半空间 n·(o+td) ≤ 0 的 t 区间收窄（扇段角度域的径向边，非轴对齐故独立于 slab） */
function halfspace($n: Vec2, $o: Vec2, $d: Vec2, $span: RaySpan): boolean {
  const no = $n[0] * $o[0] + $n[1] * $o[1]
  const nd = $n[0] * $d[0] + $n[1] * $d[1]
  if (nd === 0) return no <= 0
  const bound = -no / nd
  if (nd > 0) { if (bound < $span.hi) $span.hi = bound }
  else { if (bound > $span.lo) $span.lo = bound }
  return $span.lo <= $span.hi
}

/** 圆盘 |o+td| ≤ r 的 t 区间收窄（扇段径向界 — 二次不等式求根） */
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

/** 射线×盒（Rect 挤出体）— 三轴 slab 精确测试 */
function rayBox($ray: Ray3, $box: WorldBox): boolean {
  const span: RaySpan = { lo: 0, hi: Infinity }
  return slab($ray.o[0], $ray.d[0], $box.min[0], $box.max[0], span)
    && slab($ray.o[1], $ray.d[1], $box.min[1], $box.max[1], span)
    && slab($ray.o[2], $ray.d[2], $box.min[2], $box.max[2], span)
}

/**
 * 射线×条（Line 挤出体）— 局部系 x（半长 hx）× 局部系 y（半厚 hy）× 世界 z 三轴 slab
 * 世界 → 局部 = 平移到中心 + 旋转 -ang（ang 为世界系角度，与 packer 的 atan2(-dy,dx) 同源）
 */
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

/**
 * 射线×楔（Arc 挤出体）— 扇形 = 圆盘 ∩ 两径向边半空间（凸分解）
 * start³ᴰ/sweep³ᴰ 为世界系参数（Y 翻转镜像：start=-startAng, sweep=-屏幕扫角，与 packer 同源）
 * |sweep| ≥ π 时扇形凸分解不成立 — 退化为整圆盘（大扇段命中体验优先于边界精确）
 */
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
    // 角度域内点 = 始边的扫向侧 ∧ 终边的逆扫向侧（cross(e,p) 符号按扫向统一）
    const sgn = $sweepWorld < 0 ? 1 : -1
    const ns: Vec2 = [-sgn * Math.sin(sa), sgn * Math.cos(sa)]
    const ne: Vec2 = [sgn * Math.sin(ea), -sgn * Math.cos(ea)]
    if (!halfspace(ns, o, d, span)) return false
    if (!halfspace(ne, o, d, span)) return false
  }
  return true
}

/**
 * 射线×挤出体（逐槽位精测）— 几何参数逐字镜像 render-3d packer:
 *   Rect  → 盒体（anim 底部锚点生长 + hover 底部中心缩放）
 *   Line  → 条体（anim 起点延伸 + hover 加粗 2×）
 *   Arc   → 楔体（anim 半径生长 + hover 半径缩放）
 *   其余原语 3D 后端不渲染 → 不拾取
 */
function rayBody($m: TsuModel, $ray: Ray3, $i: number, $aabbBuf: Bounds): boolean {
  const halfZ = HALF_EXTRUDE_Z
  const t = $m.anim[$i]
  const hover = $m.hoverSlots.has($i)

  // 图表 AABB 粗筛（同点流语义 — 含 Line/Triangle 的 4px 命中余量）
  // 注意 hover 中元素盒是缩放后的 — z 板夹取中点落在缩放盒外不等于未命中几何体，
  // 故仅当未 hover 时用 aabb 收紧；hover 中元素跳过粗筛直接精测
  if (!hover) {
    const aabb = $m.aabbInto($i, $aabbBuf)
    if (!rayBox($ray, toWorldSpace(aabb, halfZ))) return false
  }

  switch ($m.type[$i]) {
    case Prim.Rect: {
      // rectToWorld: 中心 x 不变 / 底部锚点 / hover 底部中心缩放
      const x = $m.x[$i], y = $m.y[$i], w = $m.w[$i], h = $m.h[$i]
      let _dw = w, _dh = h * t
      if (hover) { _dw = w * HOVER_SCALE; _dh = h * t * HOVER_SCALE }
      const cx = x + w / 2
      const cy = -(y + h - _dh / 2)       // 世界系中心（Y 翻转）
      return rayBox($ray, {
        min: [cx - _dw / 2, cy - _dh / 2, -halfZ],
        max: [cx + _dw / 2, cy + _dh / 2, halfZ],
      })
    }
    case Prim.Line: {
      // lineToWorld: 起点锚点延伸 + hover 加粗（2×）；零长度退化不可见不拾取
      const x = $m.x[$i], y = $m.y[$i]
      const dx = $m.w[$i] * t, dy = $m.h[$i] * t
      if (dx === 0 && dy === 0) return false
      const hy = (hover ? STROKE_LOCKED / STROKE_NORMAL : 1) * C3D.THICK_LINE / 2
      const ang = Math.atan2(-dy, dx)     // 世界系角度（Y 翻转，与 packer 同源）
      return rayBar(
        $ray, x + dx / 2, -(y + dy / 2), ang,
        Math.hypot(dx, dy) / 2, hy, halfZ,
      )
    }
    case Prim.Arc: {
      // sectorToWorld: 半径生长 + hover 半径缩放；世界角 = 翻转镜像
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
  return false   // Curve/Circle/Text/Triangle — 3D 后端不渲染，不拾取
}

export class Grid implements Spatial {
  // —— 划分区（哈希网格 · broad phase 粗筛）——

  private cells = new Map<number, Set<number>>()
  private slotCells = new Map<number, number[]>()
  private cellSize: number

  // —— 聚合区（取景相机 · 空间换算）——

  /** 取景相机 — CoordMapper 策略（构造注入，永久依赖；2D 视线仿射 / 3D 相机，与渲染后端成对） */
  private camera: CoordMapper

  // —— 命中区（碰撞检测 · narrow phase 精筛）——

  /** aabbInto 复用缓冲（命中检测热路径零分配） */
  private aabbBuf: Bounds = [[0, 0], [0, 0]]

  constructor(cellSize = DEFAULT_CELL_SIZE, $camera?: CoordMapper) {
    this.cellSize = cellSize
    this.camera = $camera ?? new CoordMapper2D()
  }

  // —— 聚合区 API ——

  /** 3D 模式标志 — 聚合区转发（渲染后端类型判定；视线交互全模式通用，差异在相机双实现） */
  get is3D(): boolean {
    return this.camera.is3D
  }

  /** 取景 — layering.task 每帧调用（聚合内容盒 → 取景 → 矩阵）；返回 true = 取景变了 */
  frame($m: TsuModel, $w: number, $h: number): boolean {
    return this.camera.frame($m, $w, $h)
  }

  /** 视线推近/拉远 — 滚轮交互转发（interact → 相机，视线状态归相机所有；锚点=跟手缩放钉住的屏幕点） */
  zoomBy($delta: number, $ax?: number, $ay?: number): void {
    this.camera.zoomBy($delta, $ax, $ay)
  }

  /** 视线绕场景旋转 — 拖拽交互转发（interact → 相机，视线状态归相机所有） */
  orbitBy($dx: number, $dy: number): void {
    this.camera.orbitBy($dx, $dy)
  }

  /** 屏幕像素 → 图表平面坐标（命中区点流换算；null = 无法换算） */
  worldToCoordXY($sx: number, $sy: number): Vec2 | null {
    return this.camera.worldToCoordXY($sx, $sy)
  }

  /** 屏幕像素 → 世界系视线射线（命中区射线流换算；null = 无相机） */
  pickRay($sx: number, $sy: number): Ray3 | null {
    return this.camera.pickRay($sx, $sy)
  }

  /** 本帧视线仿射/剪裁矩阵 — 双形态透传（layering 基准重建 + draw 传 renderer；渲染与命中同源） */
  get cameraMatrix(): Float32Array | null {
    return this.camera.clipMatrix
  }

  /** 本帧视线（相机光轴）— draw 阶段传给 renderer.flush（渲染/命中/光照三方同源） */
  get cameraSight(): Vec3 | null {
    return this.camera.sight
  }

  /** 视线之外 — layering 视口剔除判定转发（2D 正仿射屏幕域换算 / 3D 恒 false 保守放行） */
  outOfSight($bounds: Bounds, $w: number, $h: number): boolean {
    return this.camera.outOfSight($bounds, $w, $h)
  }

  // —— 命中区 API ——

  /**
   * 碰撞检测统一入口 — interact 唯一拾取调用（单出口；model 逐调用传入，纯读零写）
   * 内部自选流: 3D 视线射线就绪 → 射线流；否则（2D / 3D 相机未就绪）→ 点流
   * 返回: null = 无法检测（3D 相机未就绪 / 2D 无法换算）；[] = 检测无命中
   */
  onHitTest($m: TsuModel, $sx: number, $sy: number): number[] | null {
    const ray = this.pickRay($sx, $sy)
    return ray ? this.hitByRay($m, ray) : this.hitByPoint($m, $sx, $sy)
  }

  /**
   * 射线流（3D 挤出体真三维命中）:
   *   ① z 板夹取 — 视线与 ±挤出半厚 z 板求交，图表系坐标取交点段中点
   *      （一处粗筛同时完成"视线掠过模型"与"图表系候选"两个任务，避免逐原语投影反查）
   *   ② 划分区候选 — queryPoint 3×3 邻域（z 板中点）
   *   ③ rayBody 逐槽位精测 — 挤出体谓词（几何参数逐字镜像 render-3d packer）
   */
  private hitByRay($m: TsuModel, $ray: Ray3): number[] {
    const halfZ = HALF_EXTRUDE_Z
    const hits: number[] = []

    // ① z 板夹取 — 视线穿过 [−halfZ, +halfZ] 的图表系投影段的中点
    if ($ray.d[2] !== 0) {
      let _t0 = (-halfZ - $ray.o[2]) / $ray.d[2]
      let _t1 = (halfZ - $ray.o[2]) / $ray.d[2]
      if (_t0 > _t1) { const s = _t0; _t0 = _t1; _t1 = s }
      if (_t1 > 0) {
        const tm = (Math.max(_t0, 0) + _t1) / 2
        const mid: Vec2 = [$ray.o[0] + $ray.d[0] * tm, -($ray.o[1] + $ray.d[1] * tm)]
        // ②③ 划分区候选 + rayBody 精测
        for (const slot of this.queryPoint(mid)) {
          if (slot < 0 || slot >= $m.count) continue
          if (rayBody($m, $ray, slot, this.aabbBuf)) hits.push(slot)
        }
        return hits
      }
    }
    return hits
  }

  /**
   * 点流（2D 点拾取）:
   *   ① 视线反解 — worldToCoordXY 屏幕像素 → 图表平面坐标（null = 无法检测）
   *   ② 划分区候选 — queryPoint 3×3 邻域
   *   ③ 内联精测 — AABB 粗筛 + Arc 角度/半径精筛 + Triangle 重心坐标精筛
   *      （多原语叠加时同一位置可命中多个原语 — 收集全部命中槽位）
   */
  private hitByPoint($m: TsuModel, $sx: number, $sy: number): number[] | null {
    // ① 视线反解
    const pos = this.worldToCoordXY($sx, $sy)
    if (!pos) return null

    // ② 划分区候选
    const candidates = this.queryPoint(pos)

    // ③ 内联精测
    const hits: number[] = []
    for (const slot of candidates) {
      if (slot < 0 || slot >= $m.count) continue
      const aabb = $m.aabbInto(slot, this.aabbBuf)
      const [min, max] = aabb
      // AABB 粗筛
      if (
        pos[0] < min[0] || pos[0] > max[0] ||
        pos[1] < min[1] || pos[1] > max[1]
      ) continue

      // Arc 精筛 — 半径 + 角度（饼图所有扇形 AABB 重叠，需角度区分）
      if ($m.type[slot] === Prim.Arc) {
        const a = slot * GEO_SLOTS_EACH_ELEM
        const r = $m.aux[a]
        const cx = $m.x[slot]
        const cy = $m.y[slot]
        const dx = pos[0] - cx
        const dy = pos[1] - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > r) continue  // 超出半径
        // 角度判定 — atan2 返回 [-π, π]，需归一化到扇形角度范围
        let _ang = Math.atan2(dy, dx)
        const startAng = $m.aux[a + 1]
        const endAng = $m.aux[a + 2]
        while (_ang < startAng) _ang += TAU
        if (_ang > endAng) continue  // 不在扇形角度内
      }

      // Triangle 精筛 — point-in-triangle（雷达切片共享圆心，AABB 重叠需精确判定）
      if ($m.type[slot] === Prim.Triangle) {
        const a = slot * GEO_SLOTS_EACH_ELEM
        // 三顶点：V_d / V_{d+1} / C
        const v0x = $m.x[slot], v0y = $m.y[slot]
        const v1x = v0x + $m.w[slot], v1y = v0y + $m.h[slot]
        const v2x = v0x + $m.aux[a], v2y = v0y + $m.aux[a + 1]
        const px = pos[0], py = pos[1]
        // 重心坐标法 — 三角形内当且仅当三个叉积同号
        const d1 = (px - v1x) * (v0y - v1y) - (v0x - v1x) * (py - v1y)
        const d2 = (px - v2x) * (v1y - v2y) - (v1x - v2x) * (py - v2y)
        const d3 = (px - v0x) * (v2y - v0y) - (v2x - v0x) * (py - v0y)
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0
        if (hasNeg && hasPos) continue  // 不在三角形内
      }

      hits.push(slot)
    }
    return hits
  }

  // —— 划分区 API ——

  /**
   * 覆盖分桶 — AABB 覆盖到的所有 cell 都登记 slot
   * （原中心点分桶下，跨度超过 cellSize 的元素 3×3 邻域查询会漏检 — 覆盖语义天然免疫；
   *   图表元素量级小，多格登记的常数开销可忽略）
   */
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
    this.slotCells.set($slot, keys)   // 桶 key 全集 — remove 精确撤回每一格
  }

  /** 撤桶 — 按 insert 登记的 key 全集逐格删除（覆盖分桶的精确逆操作） */
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

  /** 换桶 — 撤旧登新（layering 每帧对脏元素调用；Spatial 契约成员） */
  update($slot: number, $bounds: Bounds): void {
    this.remove($slot)
    this.insert($slot, $bounds)
  }

  /** 点查询 — 查 3×3 邻域（参考 SC2 碰撞检测；覆盖分桶下邻域内元素必然已登记） */
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

  /**
   * 范围查询 — 遍历覆盖的所有 cell，返回候选 slot
   */
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
