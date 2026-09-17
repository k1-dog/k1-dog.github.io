/**
 * tsukiyo (月读) — 极简 2D/3D 可视化库。
 * 设计哲学：图表类型 = coord 规则 + point 映射的组合（Bar/Line/Radar 非独立类）。
 * 核心架构：SoA 唯一数据源（13 个平行 TypedArray 零冗余）；Scheduler 唯一时钟（16ms lockstep）；
 * 数据流 input→point→coord→paths→interact→layering→draw；空间哈希网格+脏矩形局部重绘；
 * Intake 摄入口（外部事件统一缓冲）；Schedulable 幂等 bind/unbind；WebGPU 优先 Canvas2D 回退。
 * 目录四层治理：helper/（const/canvas Hcvs_/maths Hm_/kit Hs_）· m/（model SoA 出口 / std 标准化）
 * · v/（shape/coord/paths/layering/camera3/render+render-3d+wgsl/interact）· middleware/（scheduler/engine/index/spatial/dirty）。
 *
 * .eg new Tsukiyo(canvas).input([10,20,100]).coord('Bar')
 *        .point((el,p,i) => Shapes.rect(30, el.value, rgba(100,149,237,200))).draw()
 *     // 实时更新：bar.data([50, 60, 70])
 */

// 入口
export { Tsukiyo } from './middleware/index'

// 图形原语 / 调色板 / 坐标 / 路径
export { Shape, Shapes, rgba } from './v/shape'
export type { PointFn } from './v/shape'
export { Hm_palette as palette } from './helper/maths'
export { coordTask, resolveCoordLocator, radarRadius } from './v/coord'
export { pathsTask } from './v/paths'
export type { PathsHook } from './v/paths'

// 数据模型 / 引擎 & 调度
export { TsuModel } from './m/model'
export { std } from './m/std'
export { Engine } from './middleware/engine'
export type { EngineOpts } from './middleware/engine'
export { Scheduler } from './middleware/scheduler'
export { Grid } from './middleware/spatial'
export { Dirty } from './middleware/dirty'
export { Interact } from './v/interact'
export { Layering } from './v/layering'
export { Hcvs_retina as retina, Hcvs_getDpr as getDpr } from './helper/canvas'
export type { RetinaResult } from './helper/canvas'

// 渲染 / 类型契约
export { createRenderer } from './v/render'
export { WebGPU3D } from './v/render-3d'
export type {
  Vec2, Bounds, Element, DimConf, ShapeDesc, RenderMode,
  CoordRule, CoordCtx, Task, Renderer, Spatial, Plugins, Schedulable,
} from './yomi'
export { Prim, _ } from './yomi'

// 摄入口 / 工具
export { Hs_createIntake as createIntake } from './helper/kit'
export type { Intake } from './helper/kit'
export { Hs_Wish as Wish, Hs_Pool as Pool } from './helper/kit'
export { Hm_lerp as lerp, Hm_clamp as clamp, Hm_mapRange as mapRange, Hm_Ease as Ease, Hm_dist as dist, Hm_containsPoint as containsPoint } from './helper/maths'
export { Hcvs_batch as batch } from './helper/canvas'
export type { Batch } from './helper/canvas'
