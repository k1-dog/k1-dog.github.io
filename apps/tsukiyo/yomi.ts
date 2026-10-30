/**
 * yomi（読み）— 共享类型契约：全部模块只从这里 import 类型
 * type-only 编译期擦除——跨模块循环从构造上不可能
 */
import type { TsuModel } from './m/model'
import type { Box, Pen } from './v/pen'

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type Aabb = [Vec2, Vec2]

/** world-space ray (o = eye, d = direction; d need not be normalized) */
export interface Ray3 {
  o: Vec3
  d: Vec3
}

// 占位符 — arc 角度占位（= 值切分声明）
export const _ = '_' as const
export type Placeholder = typeof _
export type CoordVal = number | Placeholder | string

/** 归一化元素（std 产出；scale 展开 nx/ny/nr 声明） */
export interface Element {
  dimX: string
  dimY: string
  value: number
  nx?: number
  ny?: number
  nr?: number
  x?: number
  y?: number
  r?: number
  [key: string]: any
}

export interface DimConf {
  dimX: string
  dimY: string[]
}

/**
 * 形状声明 — 一个对象、九个字段封顶（永不扩张）
 * geo 写局部几何——锚点 / 生长 / 包围盒 / 命中全部由框架接管
 */
export interface ShapeSpec {
  /** 参数名 → 默认值（≤5 个 按序落 aux 槽） */
  slots?: Record<string, number>
  /** 几何 — 局部盒 → 绘制指令；返回值可替代主路径 */
  geo: (e: Box, pen: Pen) => void | Path2D
  /** 生长 — 值 → 局部尺寸（像素换算在这里完成 缺省不生长） */
  grow?: (v: number, e: Box, ctx: CoordCtx) => void
  /** 补间 — 局部盒按进度 p 改写；缺省按 kind 推导 */
  tween?: (e: Box, p: number) => void
  /** 是否闭合填充（缺省 false = 描边） */
  fill?: boolean
  /** 描边宽度 */
  lineWidth?: number
  /** 虚线间距 */
  dash?: number[]
  /** 入场延迟（生长步数 负数起步自然错开时序） */
  λDelay?: number
  /** 3D 挤出语义（缺省不挤出） */
  three?: 'box' | 'bar' | 'sector'
  /** 内部几何族 — paths 阶段据此求尺寸（不是渲染分支） */
  kind?: 'rect' | 'circle' | 'line' | 'arc' | 'ring' | 'text' | 'curve' | 'triangle'
  /** 文字类形状 — 不走 Path2D */
  text?: boolean
}

export interface ShapeDesc {
  /** 注册序号 — 与内置形状走同一条通道 */
  id: number
  /** 参数值（缺省取 spec.slots 默认值） */
  opts?: Record<string, number>
  /** 覆盖 spec 的填充色 */
  fill?: number
}

/** 轴投影 — 元素 + 尺度上下文 + 维度下标 → 坐标 */
export type Proj = (el: Element, ctx: CoordCtx, iX: number, iY: number) => number

/** 初始包 — θ 极角起点 / y0 零基线 / zoom 一次性初始缩放 */
export interface Init {
  θ?: number
  y0?: boolean
  zoom?: number
}

export interface ITsukiyoLocator {
  x: Proj
  y: Proj
  grid: 'cartesian' | 'polar' | 'radar' | 'none'
  /** 域声明 — 数值轴读取的元素字段名（scale 统计 x0/x1 用） */
  dom?: { x?: string; y?: string }
  init?: Init
  ctx?: CoordCtx | null
}

export type CoordRule =
  | string
  | ITsukiyoLocator
  | ((world: { width: number; height: number; dimYCount: number }) => ITsukiyoLocator)

/** 尺度上下文 — 域扫描 + 视口（w/h 视口 dX/dY 维数 v0/v1/vΣ 值域 x0/x1 数值域） */
export interface CoordCtx {
  w: number
  h: number
  dX: number
  dY: number
  v0: number
  v1: number
  vΣ: number
  x0?: number
  x1?: number
  /** 数值 x 轴读取的字段名（scale 声明 coord 消费） */
  domX?: string
}

/** 链路声明 — Δi 目标槽（数值或 '+1'/'next@key' 符号）
 *  ΔfromP/ΔtoP 笛卡尔锚点偏移 / Δr/'Δangle°' 极向锚点 / Δloop 只描边 / fill 闭合填充 */
export interface RoadConf {
  Δi: number | string
  ΔfromP?: [number, number]
  ΔtoP?: [number, number]
  Δr?: number
  'Δangle°'?: number
  Δloop?: boolean
  fill?: number
}

/** 声明式链路规则（4 字段封顶 永不扩张；复杂拓扑写 RoadFn） */
export interface RoadRule {
  /** 回绕闭合 — 同系列末点接回首点 */
  loop?: boolean
  /** 同步进 — +1 = 同链下一节点 */
  step?: number
  /** 同组跳转 — 'cloud' = 同 cloud 键的下一个 */
  by?: string
  /** 闭合填充色 */
  fill?: number
}

export type RoadFn = (el: Element, i: number, model: TsuModel, ctx: CoordCtx) => RoadConf | null

/** 自绘层钩子 — paint 声明时无子引擎、直接画入层画布 */
export type LayerPaint = (
  ctx: CanvasRenderingContext2D, w: number, h: number,
  model: TsuModel, locator: ITsukiyoLocator | null,
) => void

export interface LayerConf {
  input?: any[]
  shape?: ShapeFn
  coord?: CoordRule
  paths?: RoadFn | RoadRule
  dim?: DimConf
  z: number
  /** 自绘层 — 无子引擎 paint 直接画入层画布（网格背景） */
  paint?: LayerPaint
  /** 层尺寸 — 'host' 贴主画布宿主盒（inset:0）；缺省跟随主视口 */
  size?: 'host'
  /** 相机共享 — true 搭乘主相机；缺省独立 */
  sharedCamera?: boolean
  /** 视图跟随 — true 主视图每次移动都重绘该层 */
  followView?: boolean
}
export type LayoutFn = () => { layers: LayerConf[] }

/** 闭合链填充 — paths 阶段产物（RoadConf.fill 声明时）
 *  area = 保守包围盒——underlay 裁剪到重绘域 自身范围必须并入脏域 */
export interface FillRoad {
  paths: Path2D[]
  color: number
  area: Aabb
}

/** 每帧视图包 — 矩阵 / 视线 / 内容区（复用缓冲 render 与命中读同一份） */
export interface View {
  m: Float32Array | null
  sight: Vec3 | null
  area: Aabb | null
}

/** layering 阶段产物 — 交给 draw 的视觉包 */
export interface RenderBatch {
  /** 合并脏域 — clearRect + 裁剪域 */
  area: Aabb | null
  /** 大域列表 — 域内且视口内的槽 */
  bigArea: number[]
  road: FillRoad | null
  view: View
}

/** 任务 — step 返回值即该阶段产物（作为下一阶段实参）；undefined = 本 tick 无产出 */
export interface Task {
  name: string
  after?: string[]
  step: (...deps: any[]) => unknown
}

export type RenderMode = '2d' | '3d'

/** 绘制状态 — 变更即推送（绝不轮询）
 *  idle 未投数据 / growing 生长中 / done 画完 / paused 停摆或离屏 */
export type TsuStatus = 'idle' | 'growing' | 'done' | 'paused'

export interface Renderer {
  init(canvas: HTMLCanvasElement): void
  flush(model: TsuModel, batch: RenderBatch): void
}

/** 相机契约 — 2D 仿射 / 3D 透视持有者；视图状态住在两个实现里 interact 零分支 */
export interface CoordMapper {
  readonly is3D: boolean
  /** 取景 — 每帧；返回 Λ = 可视域增长或位姿移动 */
  frame(area: Aabb | null, w: number, h: number, initZoom?: number): boolean
  /** 缩放 — ax/ay = 缩放时钉住的屏幕锚点（3D 忽略） */
  zoom(delta: number, ax?: number, ay?: number): void
  /** 旋转（2D 视线平移 / 3D 转动+俯仰） */
  orbit(dx: number, dy: number): void
  /** 屏幕 → 图表坐标（2D 逆仿射；3D 恒 null） */
  at(sx: number, sy: number): Vec2 | null
  /** 屏幕 → 世界射线（3D；2D 恒 null） */
  ray(sx: number, sy: number): Ray3 | null
  /** 本帧视图包 */
  readonly view: View
  /** 视口剔除（2D 正向仿射 / 3D 保守通过） */
  culled(area: Aabb, w: number, h: number): boolean
}

// packed RGBA
export type RGBA = number

export interface Plugins {
  vToM: (slot: number) => Element | null
  mToV: (query: Partial<Element>) => number[]
}

/** 形状映射 — 元素 → 形状声明（可返回多个或 null 跳过） */
export type ShapeFn = (
  el: Element, plugins: Plugins, index: number, ctx: CoordCtx,
) => ShapeDesc | ShapeDesc[] | null

export type { Box, Pen }