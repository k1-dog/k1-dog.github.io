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
  Rect, Arc, Line, Curve, Circle, Text, Triangle, Ring,
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
// 坐标系初始参数：θ=polar 起始角（paths 消费）；y0=Y 轴是否 0 基线 + 1.2 上扩（缺省 true；连续值域显式 false）；
// zoom=初始视线缩放（缺省 1 = 不缩放；engine 在首次成功 coord 投影后经 zoomBy 一次性应用，与滚轮缩放同路径同效果）
export interface TsukiyoInit {
  θ?: number
  y0?: boolean
  zoom?: number
}

// —— 坐标系定位器（resolveCoordLocator 返回值）——
// 投影定位到坐标系具体位置的机器：两根轴 + 网格族标记 + 参数包 + 摄入输入 + 投影产物
export interface ITsukiyoLocator {
  x: AxisRule
  y: AxisRule
  grid: 'cartesian' | 'polar' | 'radar'   // grid family of the default layer (layering single source)
  init?: TsukiyoInit                      // 参数包（θ/y0）
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

// —— 跨图形路径封闭 ——
// 元素的 Δ 连接目标声明：由 paths 回调逐元素返回，
// 引擎不做任何隐式系列推断（连接语义的唯一事实源）。
// 锚点偏移声明自描述坐标系（引擎不查图形类型）：
//   ΔfromP/ΔtoP — 笛卡尔锚（Line/Curve 等直角坐标链）
//   Δr/Δangle°  — 极坐标锚（arc 等扇段链）：锚 = x + Δr·cos(θ+Δangle°)…
//   θ 取目标元素极坐标语义角度（arc aux 角度），未声明时退化为笛卡尔
export interface SealConf {
  Δi: number                    // target element row index（目标元素行号）
  ΔfromP?: [number, number]     // cartesian source anchor offset（源锚点偏移；缺省 _ = [0,0]）
  ΔtoP?: [number, number]       // cartesian target anchor offset（目标锚点偏移；缺省 _ = [0,0]）
  Δr?: number                   // polar radius offset（极坐标半径偏移；扇段链）
  'Δangle°'?: number            // polar angle offset in degrees（极坐标角度偏移）
  Δloop?: boolean               // join the closed fill chain?（缺省 true；
                                // false = stroke geometry only, skip the fill lane）
}

// paths 回调 — 逐元素问询跨图形封闭规则
//   返回 SealConf → 显式连接（Δi 越界/目标非 Line/Curve 守卫为断开）
//   返回 null / undefined → 断开（Δ=0）
//   缺省不传 → defaultSeal（{Δi: i+1}，折线系列紧密连接）
export type SealFn = (el: Element, i: number, model: TsuModel, ctx: CoordCtx) => SealConf | null

// —— layering 分层配置 ——
// 每个分层 = 一个完整子图表引擎（独立 canvas 层 + 独立核心工作流 input→point→coord→paths→layering→draw）；
// 未传 layering 回调时默认 = 网格背景层（z:-1，绘制行为与旧内置 grid 完全一致）
// PointFn 签名内联（v/shape.ts 的同名类型会循环导入 yomi，此处仅声明结构）
export interface LayerPointFn {
  (el: Element, plugins: Plugins, index: number): any
}
export interface LayerConf {
  input: any[]          // 层元素数据
  point: LayerPointFn   // 层元素 → Shape
  coord: CoordRule      // 层坐标规则
  paths?: SealFn        // 层路径封闭（可选）
  dim?: DimConf         // 层维度（可选）
  z: number             // numeric z-order: layers sort by z; z<0 below the main canvas, z>0 above
  /** layer size rule — 'host' = glue the layer canvas to the LAYER HOST
   *  (the main canvas' parent) with CSS inset:0 stretch: the layer keeps
   *  the host edges NO MATTER how the main canvas resizes or insets
   *  (decoration frames etc). undefined = track the main engine viewport
   *  (default; the grid-layer behaviour). The main resize cascade skips
   *  'host' layers entirely — workflows stay decoupled */
  size?: 'host'
  /** camera sharing rule — true = the sub-engine rides the MAIN camera
   *  (its rendering re-transforms with the main layer's zoom/pan, e.g. a
   *  background layer that must track the view). undefined/false = an
   *  ISOLATED camera of its own: main-layer zoom/pan never touches this
   *  layer (decorations etc). The sub-engine NEVER binds DOM events
   *  (interact:false) — sharing is rendering-only, never event-side */
  sharedCamera?: boolean
}
export type LayoutFn = () => { layers: LayerConf[] }

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
 *  clipMatrix 裁剪矩阵 + sight 视线（同一次取景产出，渲染命中同源）；两者 Canvas2D 忽略。
 *  underlay — closed-path fill layer (paths-stage derived Path2D chains + registered color);
 *  painted after clearRect and before the batched prims, so it always sits under the strokes */
  flush(
    model: TsuModel, regionDrawing: Bounds | null, regionBigDrawing?: number[],
    clipMatrix?: Float32Array | null, sight?: Vec3 | null,
    underlay?: { paths: Path2D[], color: number } | null,
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
