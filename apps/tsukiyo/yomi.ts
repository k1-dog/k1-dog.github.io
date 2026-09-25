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

// 占位符 — 继承坐标系计算值（Arc 角度占位 = 按 value 比例分配）
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

// —— 单轴定位规则 ——
// 一根轴 = 域（kind，grid 消费）+ 投影（at，coord 消费），内聚单对象
export interface AxisRule {
  kind: 'cat' | 'num'
  field?: string          // 数值轴读取字段（缺省 el[el.dimX]；x 值域扫描同源）
  at: (el: Element, dimX: number, dimY: number, ctx: CoordCtx) => number
}

// —— 坐标系参数包 ——
// 坐标系初始参数：θ=polar 起始角（paths 消费）；y0=Y 轴是否 0 基线 + 1.2 上扩（缺省 true；连续值域显式 false）
export interface TsukiyoInit {
  θ?: number
  y0?: boolean
}

// —— 坐标系定位器（resolveCoordLocator 返回值）——
// 投影定位到坐标系具体位置的机器：两根轴 + 网格族标记 + 参数包 + 摄入输入 + 投影产物
export interface ITsukiyoLocator {
  x: AxisRule
  y: AxisRule
  grid: 'cartesian' | 'polar' | 'radar'   // 网格族（layering 单源判定）
  init?: TsukiyoInit                      // 参数包（θ/y0）
  coordRule?: CoordRule                   // 解析输入 — engine 构造挂载，coord task 解析后覆盖
  ctx?: CoordCtx | null                   // 最近一次投影产物 — coordTask 单点写
}

// —— 坐标规则来源 — resolveCoordLocator 入参：内置名 / 定位器对象 / 工厂函数 ——
export type CoordRule =
  | string
  | ITsukiyoLocator
  | ((world: { width: number; height: number; dimYCount: number }) => ITsukiyoLocator)

// 坐标上下文 — 统一 CSS 坐标系（retina setTransform 已处理 DPR）
export interface CoordCtx {
  width: number
  height: number
  count: number
  dimXCount: number
  dimYCount: number
  valueMin: number   // 数据域下界（归一化，替代独立 Scale 模块）
  valueMax: number   // 上界
  valueSum: number   // 总和（Arc 角度分配）
  xMin?: number      // X 数值域下界（x.kind='num' 时扫描，grid 刻度消费）
  xMax?: number      // X 数值域上界
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
