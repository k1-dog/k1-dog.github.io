/**
 * tsukiyo (月读) — 极简 2D/3D 可视化库。
 *
 * 设计哲学：
 *   图表类型 = coord 规则 + point 映射的组合，不是独立类。
 *   Bar  = coord('Bar')  + point(rect)
 *   Line = coord('Line') + point(line)
 *   Radar = coord('radar') + point(triangle)
 *
 * 核心架构：
 *   - SoA (Structure of Arrays) 唯一数据源，12 个平行 TypedArray，零冗余
 *   - Scheduler 唯一时钟（16ms tick lockstep）
 *   - 数据流：input → point → coord → paths → interact → layering → draw
 *   - 空间哈希网格 + 脏矩形收集 → 局部重绘
 *   - Intake 摄入口：外部事件经 Scheduler 统一缓冲
 *   - Schedulable 契约：交互等外部资源模块的幂等 bind/unbind
 *   - WebGPU 优先，Canvas2D 回退
 *   - ECS + SoA 存储，CPU 缓存友好，SIMD 可扩展
 *
 * helper 工具包结构：
 *   - const.ts   (Hc_ 前缀)  — 常量配置
 *   - canvas.ts  (Hcvs_ 前缀) — Canvas API 封装 + 视网膜初始化 + 批渲染分组
 *   - maths.ts   (Hm_ 前缀)  — 数学计算 + RGBA 颜色 + 调色板
 *   - std-1.ts   (Hs_ 前缀)  — 数据标准化 + 类型工具 + Wish + Pool + Intake
 *
 * 用法示例：
 *
 *   import { Tsukiyo, Shapes, rgba } from './apps/tsukiyo'
 *
 *   // Bar chart
 *   const bar = new Tsukiyo(canvas)
 *     .input([10, 20, 100])
 *     .coord('Bar')
 *     .point((el, p, i) => Shapes.rect(30, el.value, rgba(100, 149, 237, 200)))
 *     .draw()
 *
 *   // Line chart
 *   const line = new Tsukiyo(canvas)
 *     .input([10, 20, 100])
 *     .coord('Line')
 *     .point((el, p, i) => Shapes.line(rgba(255, 99, 71, 255)))
 *     .draw()
 *
 *   // Radar chart with multi-dimension data
 *   const radar = new Tsukiyo(canvas)
 *     .input([
 *       { user: 'kurumi', top: 30, mid: 100, bot: 50 },
 *       { user: 'origami', top: 80, mid: 80, bot: 80 },
 *     ])
 *     .scale({ dimX: 'user', dimY: ['top', 'mid', 'bot'] })
 *     .coord('polar')
 *     .point((el, p, i) => Shapes.line(rgba(50, 205, 50, 200)))
 *     .draw()
 *
 *   // 实时更新数据
 *   bar.data([50, 60, 70])
 */

// —— 入口 ——

export { Tsukiyo } from './v/index'

// —— 图形原语 ——

export { Shape, Shapes, rgba } from './v/shape'
export type { PointFn } from './v/shape'

// —— 调色板 ——

export { Hm_palette as palette } from './helper/maths'

// —— 坐标系 ——

export { coordTask, resolveCoordLocator, radarRadius } from './v/coord'

// —— 路径组装 ——

export { pathsTask } from './v/paths'
export type { PathsHook } from './v/paths'


// —— 数据模型 ——

export { TsuModel } from './m/model'
export { std } from './m/std-1'

// —— 引擎 & 调度 ——

export { Engine } from './middleware/engine'
export type { EngineOpts } from './middleware/engine'
export { Scheduler } from './middleware/scheduler'
export { Grid } from './middleware/spatial'
export { Dirty } from './middleware/dirty'
export { Interact } from './middleware/interact'
export { Layering } from './middleware/layering'
export { Hcvs_retina as retina, Hcvs_getDpr as getDpr } from './helper/canvas'
export type { RetinaResult } from './helper/canvas'

// —— 渲染 ——

export { createRenderer } from './v/render'
export { WebGPU3D } from './v/render-3d'

// —— 类型契约 ——

export type {
  Vec2, Bounds, Element, DimConf, ShapeDesc, RenderMode,
  CoordRule, CoordCtx, Task, Renderer, Spatial, Plugins, Schedulable,
} from './yomi'
export { Prim, _ } from './yomi'

// —— 摄入口 ——

export { Hs_createIntake as createIntake } from './helper/std-1'
export type { Intake } from './helper/std-1'

// —— 工具 ——

export { Hs_Wish as Wish, Hs_Pool as Pool } from './helper/std-1'
export { Hm_lerp as lerp, Hm_clamp as clamp, Hm_mapRange as mapRange, Hm_Ease as Ease, Hm_dist as dist, Hm_containsPoint as containsPoint } from './helper/maths'
export { Hcvs_batch as batch } from './helper/canvas'
export type { Batch } from './helper/canvas'
