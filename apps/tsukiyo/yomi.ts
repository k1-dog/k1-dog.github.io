/**
 * yomi (読み) — 月读的"读法"，全系统共享的类型契约。
 * 所有模块只从 yomi 导入类型，模块间零运行时依赖，从根源消除循环依赖。
 * 纯类型文件，零运行时代码。
 * 唯一例外：import type { TsuModel } — 编译期完全擦除，零运行时痕迹。
 */
import type { TsuModel } from './m/model'

// —— 基础几何类型 ——
export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type Bounds = [Vec2, Vec2]

/** 世界系射线 — 3D 射线拾取流（o=眼位, d=视线方向；d 无需归一，t 与 d 同尺度） */
export interface Ray3 {
  o: [number, number, number]
  d: [number, number, number]
}

// —— SoA 原语类型枚举 ——
export const enum Prim {
  Rect,
  Arc,
  Line,
  Curve,
  Circle,
  Text,
  Triangle,
}

// —— 占位符：继承坐标系计算值 ——
export const _ = '_' as const
export type Placeholder = typeof _
export type CoordVal = number | Placeholder | string

// —— 标准化后的元素（m/std.ts 产出）——
export interface Element {
  dimX: string
  dimY: string
  value: number
  [key: string]: any
}

// —— 维度配置 ——
export interface DimConf {
  dimX: string
  dimY: string[]
}

// —— Shape 描述符（point 阶段产出，写入 SoA）——
export interface ShapeDesc {
  type: Prim
  opts: Record<string, CoordVal>
  fill?: number
}

// —— 坐标系规则 ——
// rule: 投影数学族（cartesian/polar — coord/paths 消费）
// grid: 网格背景样式族（cartesian/polar/radar — layering 静态层消费，单源判定）
export interface CoordRule {
  rule: 'cartesian' | 'polar'
  grid?: 'cartesian' | 'polar' | 'radar'
  init?: { θ?: number }
  x: (value: number, dimX: number, dimY: number, ctx: CoordCtx) => number
  y: (value: number, dimX: number, dimY: number, ctx: CoordCtx) => number
}


// —— 坐标上下文（传给 ruler 函数的运行时信息）——
// 统一使用 CSS 坐标系（retina 的 setTransform 已处理 DPR 缩放）
export interface CoordCtx {
  width: number
  height: number
  count: number
  dimXCount: number
  dimYCount: number
  index: number
  valueMin: number   // 数据域下界（coord 归一化用，替代独立 Scale 模块）
  valueMax: number   // 数据域上界
  valueSum: number   // 数据域总和（Arc 角度分配用）
  init?: { θ?: number }  // 坐标系初始参数（如 polar 起始角，paths 阶段消费）
}


// —— Scheduler 任务 ——
export interface Task {
  name: string
  done: boolean
  after?: string[]
  step: () => void
}

// —— 渲染器接口 ——
/** 渲染后端模式 — '2d' Canvas2D（默认，全原语）；'3d' WebGPU 世界系挤出（不可用时回退 2d） */
export type RenderMode = '2d' | '3d'

export interface Renderer {
  init(canvas: HTMLCanvasElement): void
  /** 第3参 regionDrawing — 本帧重绘域（脏元素 AABB 合并矩形，clearRect + clip）
 *  第4参 regionBigDrawing — 本帧重绘元素大名单（重绘域内脏元素 ∪ 域内相交非脏元素，联动补绘）
 *  第5参 clipMatrix — 本帧相机裁剪矩阵（spatial 聚合区产出，渲染与命中同源）；Canvas2D 忽略
 *  第6参 sight — 本帧视线（相机光轴，与 clipMatrix 同一次取景产出）；Canvas2D 忽略 */
  flush(
    model: TsuModel, regionDrawing: Bounds | null, regionBigDrawing?: number[],
    clipMatrix?: Float32Array | null, sight?: Vec3 | null,
  ): void
}

// —— 坐标映射契约 — 取景 + 拾取双流 + 渲染矩阵（spatial 聚合区持有，interact/draw 消费）——
// 2D 视线仿射（gazeM）/ 3D 相机（视线反解）— 与渲染后端在工厂成对创建
// 视线状态（zoom / gaze 或 tilt·turn）由 mapper 双实现各自唯一持有，interact 零 2D/3D 分支
export interface CoordMapper {
  /** 3D 模式标志 — 渲染后端类型判定（工厂成对创建时已知） */
  readonly is3D: boolean
  /** 取景 — layering 每帧调用（聚合内容盒 → 取景 → 矩阵）；返回 true = 取景变了（视线/内容/画布任一变化） */
  frame(model: any, w: number, h: number): boolean
  /** 视线推近/拉远 — 滚轮交互入口（2D 视图缩放因子 / 3D 取景距离 dolly）
 *  锚点 ax/ay = 缩放中钉住不动的屏幕点（缺省画布中心）；2D 跟手缩放 / 3D 忽略锚点 */
  zoomBy(delta: number, ax?: number, ay?: number): void
  /** 视线绕场景旋转 — 拖拽交互入口（2D 视线平移 gazeX/gazeY / 3D 偏航 turn + 俯仰 tilt 自由旋转） */
  orbitBy(dx: number, dy: number): void
  /** 点拾取流 — 屏幕像素 → 图表平面坐标（2D 逆仿射换算；3D 恒 null — 挤出体高出基平面，命中必须走 pickRay） */
  worldToCoordXY(sx: number, sy: number): Vec2 | null
  /** 射线拾取流 — 屏幕像素 → 世界系视线（3D 相机就绪时返回；2D 恒 null — 点拾取即足够） */
  pickRay(sx: number, sy: number): Ray3 | null
  /** 本帧剪裁矩阵 — 双形态：2D 返回六元视线仿射 [z,0,0,z,gx,gy]（retina 合成消费）；3D 返回 16 元 world→clip（WebGPU 消费） */
  readonly clipMatrix: Float32Array | null
  /** 本帧视线（相机光轴；与 clipMatrix 同一次取景产出；2D 恒 null）— 随拖拽自由旋转动态 */
  readonly sight: Vec3 | null
  /** 视线之外 — AABB 在当前视线取景下是否完全不可见（layering 视口剔除判定；2D 正仿射屏幕域换算 / 3D 视锥近似） */
  outOfSight(bounds: Bounds, w: number, h: number): boolean
}


// —— 空间索引接口 ——
export interface Spatial {
  insert(eid: number, bounds: Bounds): void
  remove(eid: number): void
  update(eid: number, bounds: Bounds): void
  queryPoint(p: Vec2): number[]
  queryRange(bounds: Bounds): number[]
  clear(): void
}

// —— 样式（packed RGBA）——
export type RGBA = number

// —— 插件（point 回调参数）——
export interface Plugins {
  vToM: (slot: number) => Element | null
  mToV: (query: Partial<Element>) => number[]
}

// —— 可调度模块契约 ——
// 有外部状态/资源的模块（如 Interact）实现此契约，
// 纯函数 task（coord/point 等）不需要——直接用 scheduler.add 即可。
export interface Schedulable {
  /** 任务名 — 注册到 scheduler 的唯一标识 */
  readonly taskName: string
  /** 具体任务逻辑 — 由 scheduler tick 调用 */
  task(): void
  /** 幂等激活 — 注册到 scheduler + 绑定外部资源 */
  bind(): void
  /** 幂等取消 — 从 scheduler 移除 + 解绑外部资源 */
  unbind(): void
}
