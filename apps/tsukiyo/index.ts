/**
 * tsukiyo (月读) — 可视化任意数据描述；设计哲学：命令式链式调用优先、图形语法驱动
 * （图表类型 = coord 规则 + shape 映射的组合——严禁按类型生成逻辑）
 * 核心工作流：input → scale → shape → coord → paths → layering → draw
 * （SoA 唯一数据源 · Scheduler 唯一时钟 · 阶段产物形参交棒）
 * 用法：new Tsukiyo(canvas).input([...]).coord('Bar').shape(fn).draw()
 */
export { Tsukiyo } from './middleware/index'

// 形状基元 / 颜色 / 坐标 / 链路
export { Shape, Shapes, Grow, rgba, defaultShapeFn, shape, specOf } from './v/shape'
export type { ShapeFn } from './v/shape'
export { Pen } from './v/pen'
export type { Box } from './v/pen'
export { Hm_color } from './helper/maths'
export { Axis, Radar, Band, coord, resolveLocator, radarR } from './v/coord'
export type { Band as BandFn } from './v/coord'
export { paths, defaultRoad, ruleToFn, resolveRoad } from './v/paths'
export type { RoadFn, RoadConf, RoadRule, LayerConf, LayoutFn, LayerPaint, FillRoad, ShapeSpec } from './yomi'

// 数据模型 / 引擎与时钟
export { TsuModel } from './m/model'
export { std } from './m/std'
export { scale } from './m/scale'
export { Engine } from './middleware/engine'
export type { EngineOpts } from './middleware/engine'
export { Scheduler } from './middleware/scheduler'
export { TsuSpace, boxInto, contentArea } from './middleware/spatial'
export { TsuDirty } from './middleware/dirty'
export { Interact } from './v/interact'
export { Layering } from './v/layering'
export { drawMugen } from './v/mugen'
export { grow, reset } from './v/anim'

// canvas / 工具（保留前缀——不起别名）
export { Hcvs_retina, Hcvs_getDpr, Hcvs_batch } from './helper/canvas'
export type { RetinaResult, Batch, HcvsPlace } from './helper/canvas'
export { Hm_mix, Hm_fit, Hm_map, Hm_rgba, Hm_rgbaStr, Hm_alphaFill } from './helper/maths'
export { Hs_createIntake } from './helper/kit'
export type { Intake } from './helper/kit'

// 渲染 / 类型契约
export { createRenderer } from './v/render'
export { WebGPU3D } from './v/render-3d'
export type {
  Vec2, Vec3, Aabb, Element, DimConf, ShapeDesc, RenderMode,
  Proj, ITsukiyoLocator, CoordRule, Init, CoordCtx,
  Task, Renderer, View, RenderBatch, Plugins, CoordMapper,
} from './yomi'
export { _ } from './yomi'
