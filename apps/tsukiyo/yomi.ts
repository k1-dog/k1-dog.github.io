/**
 * yomi (読み) — 全系统共享类型契约：模块只从 yomi 导入类型，零运行时依赖根除循环依赖。
 * 纯类型文件（唯一 import type 编译期擦除）。
 */
import type { TsuModel } from './m/model'

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type Bounds = [Vec2, Vec2]

/** 世界系射线（o=眼位, d=视线方向；d 无需归一，t 与 d 同尺度） */
export interface Ray3 {
  o: [number, number, number]
  d: [number, number, number]
}

export const enum Prim {
  Rect, Arc, Line, Curve, Circle, Text, Triangle,
}

// 占位符 — 继承坐标系计算值
export const _ = '_' as const
export type Placeholder = typeof _
export type CoordVal = number | Placeholder | string

// 标准化元素（std 产出）
export interface Element {
  dimX: string
  dimY: string
  value: number
  [key: string]: any
}

export interface DimConf {
  dimX: string
  dimY: string[]
}

// Shape 描述符（point 产出写入 SoA）
export interface ShapeDesc {
  type: Prim
  opts: Record<string, CoordVal>
  fill?: number
}

// —— 坐标系规则 ——
// rule: 投影数学族（coord/paths 消费）；grid: 网格样式族（layering 静态层消费，单源判定）
export interface CoordRule {
  rule: 'cartesian' | 'polar'
  grid?: 'cartesian' | 'polar' | 'radar'
  init?: { θ?: number }
  x: (value: number, dimX: number, dimY: number, ctx: CoordCtx) => number
  y: (value: number, dimX: number, dimY: number, ctx: CoordCtx) => number
}


// 坐标上下文 — 统一 CSS 坐标系（retina setTransform 已处理 DPR）
export interface CoordCtx {
  width: number
  height: number
  count: number
  dimXCount: number
  dimYCount: number
  index: number
  valueMin: number   // 数据域下界（归一化，替代独立 Scale 模块）
  valueMax: number   // 上界
  valueSum: number   // 总和（Arc 角度分配）
  init?: { θ?: number }  // 初始参数（如 polar 起始角，paths 消费）
}

export interface Task {
  name: string
  done: boolean
  after?: string[]
  step: () => void
}

// 渲染后端模式 — '2d' Canvas2D（全原语）；'3d' WebGPU 挤出（回退 2d）
export type RenderMode = '2d' | '3d'

export interface Renderer {
  init(canvas: HTMLCanvasElement): void
  /** regionDrawing 重绘域（脏 AABB 合并，clearRect+clip）；regionBigDrawing 补绘名单（域内脏 ∪ 域内相交）；
 *  clipMatrix 裁剪矩阵 + sight 视线（同一次取景产出，渲染命中同源）；两者 Canvas2D 忽略 */
  flush(
    model: TsuModel, regionDrawing: Bounds | null, regionBigDrawing?: number[],
    clipMatrix?: Float32Array | null, sight?: Vec3 | null,
  ): void
}

// 坐标映射契约 — 视线状态由双实现各自持有（2D 仿射/3D 相机），interact 零 2D/3D 分支
export interface CoordMapper {
  readonly is3D: boolean
  /** 取景 — 每帧；true = 取景变了（视线/内容/画布任一） */
  frame(model: any, w: number, h: number): boolean
  /** 推近/拉远 — 锚点 = 跟手缩放钉住的屏幕点（2D 跟手 / 3D 忽略） */
  zoomBy(delta: number, ax?: number, ay?: number): void
  /** 旋转（2D 视线平移 / 3D turn+tilt） */
  orbitBy(dx: number, dy: number): void
  /** 屏幕 → 图表坐标（2D 逆仿射；3D 恒 null，挤出体走 pickRay） */
  worldToCoordXY(sx: number, sy: number): Vec2 | null
  /** 屏幕 → 世界射线（3D；2D 恒 null） */
  pickRay(sx: number, sy: number): Ray3 | null
  /** 剪裁矩阵 — 2D 六元 [z,0,0,z,gx,gy] / 3D 16 元 world→clip */
  readonly clipMatrix: Float32Array | null
  /** 本帧视线（相机光轴；2D 恒 null） */
  readonly sight: Vec3 | null
  /** 视口剔除判定（2D 正仿射 / 3D 视锥近似） */
  outOfSight(bounds: Bounds, w: number, h: number): boolean
}

export interface Spatial {
  insert(eid: number, bounds: Bounds): void
  remove(eid: number): void
  update(eid: number, bounds: Bounds): void
  queryPoint(p: Vec2): number[]
  queryRange(bounds: Bounds): number[]
  clear(): void
}

// packed RGBA
export type RGBA = number

export interface Plugins {
  vToM: (slot: number) => Element | null
  mToV: (query: Partial<Element>) => number[]
}

// 可调度模块契约 — 有外部资源的模块（Interact 等）实现；bind/unbind 幂等
export interface Schedulable {
  readonly taskName: string
  task(): void
  bind(): void
  unbind(): void
}
